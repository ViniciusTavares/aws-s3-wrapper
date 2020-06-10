
const { STS, S3 } = require('aws-sdk');

const { AWS_ROLE_ARN, AWS_ACCESS_ID, AWS_SECRET_KEY } = process.env;

module.exports = class S3Helper {
  constructor() {
    this.sts = new STS();
    this.roleArn = AWS_ROLE_ARN;
  }

  // Retrieving credentials might no be required if you have set your default AWS credentials 
  // Check this reference out --> https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html
  async getCrossAccountCredentials({ shouldAssumeRole = false }) {
    let result;

    if (shouldAssumeRole) {
      const { Credentials: credentialsData } = await this.sts
        .assumeRole({
          RoleArn: this.roleArn,
          RoleSessionName: 'onboarding',
        })
        .promise();

      result = {
        accessKeyId: credentialsData.AccessKeyId,
        secretAccessKey: credentialsData.SecretAccessKey,
        sessionToken: credentialsData.SessionToken,
      };
    } else {
      result = {
        accessKeyId: AWS_ACCESS_ID,
        secretAccessKey: AWS_SECRET_KEY,
      };
    }

    return result;
  }

  async getDocumentContent({ bucket, key }) {
    await this.setS3Instance();

    const { Body } = await this.s3Instance
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();

    return Body.toString();
  }

  async uploadDocument({
    bucket,
    key,
    body,
    contentType = 'application/json; charset=utf-8',
  }) {
    const credentials = await this.getCrossAccountCredentials();
    const s3 = new S3({ credentials });

    const params = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    };

    return s3.putObject(params).promise();
  }

  async mountDocumentUrl({ bucket, key }) {
    const credentials = await this.getCrossAccountCredentials();
    const s3 = new S3({ credentials });

    return `https://${bucket}.${s3.config.endpoint}/${key}`;
  }
};
