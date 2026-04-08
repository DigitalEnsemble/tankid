const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Configuration - loaded from Doppler environment variables
const config = {
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucketName: process.env.R2_BUCKET || 'tankid-docs'
};

// Validate required environment variables
if (!config.accessKeyId || !config.secretAccessKey || !config.endpoint) {
  console.error('Missing required environment variables:');
  console.error('- R2_ACCESS_KEY');
  console.error('- R2_SECRET_KEY');
  console.error('- R2_ENDPOINT');
  console.error('\nMake sure these are set in your Doppler project.');
  process.exit(1);
}

// Create S3 client for R2
const client = new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

async function generateSignedUrl(filePath, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: filePath,
    });

    const signedUrl = await getSignedUrl(client, command, { 
      expiresIn: expiresIn // seconds (3600 = 1 hour)
    });

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

// Command line usage
async function main() {
  const filePath = process.argv[2];
  const expiresIn = process.argv[3] ? parseInt(process.argv[3]) : 3600;
  
  if (!filePath) {
    console.error('Usage: node generate-signed-url-flexible.js <file-path> [expires-in-seconds]');
    console.error('Example: node generate-signed-url-flexible.js "documents/2026/04/file.pdf" 7200');
    process.exit(1);
  }
  
  try {
    console.log(`Generating signed URL for: ${filePath}`);
    console.log(`Expires in: ${expiresIn} seconds (${Math.round(expiresIn/3600*10)/10} hours)`);
    
    const signedUrl = await generateSignedUrl(filePath, expiresIn);
    console.log('\nSigned URL:');
    console.log(signedUrl);
  } catch (error) {
    console.error('Failed to generate signed URL:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateSignedUrl };