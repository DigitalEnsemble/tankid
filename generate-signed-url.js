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

console.log(`Using bucket: ${config.bucketName}`);
console.log(`Using endpoint: ${config.endpoint}`);

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

// Example usage
async function main() {
  const filePath = 'documents/2026/04/e4c0e47c-8e79-4eef-adf8-e64e2ed25b38_AST_Tank_Registration_1_of_2_Anonymized.pdf';
  
  try {
    const signedUrl = await generateSignedUrl(filePath, 3600); // 1 hour expiry
    console.log('Signed URL (expires in 1 hour):');
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