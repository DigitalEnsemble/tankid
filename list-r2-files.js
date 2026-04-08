const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Configuration - loaded from Doppler environment variables
const config = {
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  endpoint: process.env.R2_ENDPOINT,
  bucketName: process.env.R2_BUCKET || 'tankid-docs'
};

// Create S3 client for R2
const client = new S3Client({
  region: 'auto',
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
});

async function listFiles(prefix = '') {
  try {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix,
      MaxKeys: 100
    });

    const response = await client.send(command);
    
    console.log(`Files in bucket '${config.bucketName}' with prefix '${prefix}':`);
    console.log('─'.repeat(80));
    
    if (response.Contents && response.Contents.length > 0) {
      response.Contents.forEach(obj => {
        const size = (obj.Size / 1024).toFixed(1);
        console.log(`${obj.Key} (${size} KB) - ${obj.LastModified}`);
      });
    } else {
      console.log('No files found.');
    }
    
    if (response.IsTruncated) {
      console.log('\n(More files available - this is just the first 100)');
    }
    
  } catch (error) {
    console.error('Error listing files:', error.message);
    if (error.name === 'AccessDenied') {
      console.error('Your R2 access key may not have permission to list objects.');
    }
  }
}

// Command line usage
async function main() {
  const prefix = process.argv[2] || '';
  await listFiles(prefix);
}

if (require.main === module) {
  main();
}