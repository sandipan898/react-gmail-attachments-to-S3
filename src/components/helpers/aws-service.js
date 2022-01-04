import * as AWS from "aws-sdk";
class UploadMenuHelperAwsService {
  constructor() {
    // console.log("AWS >> ",AWS);
    AWS.config.region = process.env.REACT_APP_DOCAI_AWS_REGION // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: process.env.REACT_APP_DOCAI_AWS_IDENTITY_POOL,
    });
  }



  processName(name) {
    let nameParts = name.split(" ");
    let processedName = nameParts.join("_");
    return processedName;
  }



  uploadBase64FileToS3(bucketName,folderName, base64FileString, name, fileType) {
    console.log("folderName", folderName, name, base64FileString);
    let modifiedBucket = folderName===""? bucketName:`${bucketName}/${folderName}`
    let buf = Buffer.from(base64FileString,'base64')
    console.log("Filename", name + "." + fileType);
    // this.latestFileName = file.name;
    let processedName = this.processName(name);
    return new Promise((resolve, reject) => {
      if (AWS) {
        const s3 = new AWS.S3();
        s3.upload(
          {
            Key: processedName + "." + fileType,
            Bucket: modifiedBucket,
            Body: buf,
            ACL: "private",
            ContentType: fileType,
            ContentEncoding:'base64',
            Metadata: {
              "username": window.localStorage.getItem('loggedInUser')
            }
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          }
        );
      } else {
        reject("Missing AWS Client");
      }
    });
  }

  uploadFileToS3 = (file, timeStamp) => {
		return new Promise((resolve, reject) => {
			if (AWS) {
				const s3 = new AWS.S3();
				let bucketName = process.env.REACT_APP_ANALYZE_DOCUMENTS_BUCKET;
				s3.upload(
					{
						Key: `${process.env.REACT_APP_BUCKET_INPUT_FOLDER}/${timeStamp}/${file.name}`,
						Bucket: bucketName,
						Body: file,
						// ACL: "private",
						ContentType: `application/pdf`,
						Metadata: {
							"username": window.localStorage.getItem('loggedInUser')
						}
					},
					(err, data) => {
						if (err) {
							reject(err);
						} else {
							resolve(data);
						}
					}
				);
			} else {
				reject("Missing AWS Client");
			}
		});
	}

  // Function to trigger the lambda code for textract
	textractLambdaCall = (lambda_function_name, payload) => {
		return new Promise((resolve, reject) => {
			if (AWS) {
				const lambda = new AWS.Lambda();
				const params = {
					FunctionName: lambda_function_name, /* required */
					Payload: JSON.stringify(payload)
				}
				lambda.invoke(params, (err, response) => {
					if (err) {
						resolve(err)
					} else {
						resolve(response);
					}
				});
			}
		})
	}

	// Function to create the presigned url for specific image to fetch from s3
	getObjectSignedUrl2 = async (file) => {
		return new Promise((resolve, reject) => {
			if (AWS) {
				const s3 = new AWS.S3();
				let myBucket = process.env.REACT_APP_ANALYZE_DOCUMENTS_BUCKET;
				const signedUrlExpireSeconds = 5000000 // your expiry time in seconds.
				console.log("AWS >> ",AWS.config.region, AWS.config.credentials, myBucket);
				s3.getSignedUrl('getObject', { Bucket: myBucket, Key: file, Expires: signedUrlExpireSeconds }, function (err, data) {
					if (err) {
						resolve({err : err})
					} else {
						resolve({url : data})
					}
				})
			}
		})
	}

  // Fetch the specific file details
	getProcessedDocumentById = async (documentId) => {
		if (AWS) {
			const documentClient = new AWS.DynamoDB.DocumentClient();
			const params = {
				TableName: process.env.REACT_APP_ANALYZE_DOCUMENTS_DYNAMODB,
				KeyConditionExpression: "#documentId = :documentId",
				ExpressionAttributeNames:{
					"#documentId": "documentId"
				},
				ExpressionAttributeValues: {
					":documentId": documentId 
				}
			};
			try {
				var result = await documentClient.query(params).promise()
				return result.Items;
			} catch (error) {
				console.error(error);
			}
		}
	}

}

export default UploadMenuHelperAwsService;
