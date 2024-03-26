import * as AWS from 'aws-sdk'
const { Endpoint } = AWS;
import cloudinary from 'cloudinary';
import streamifier from 'streamifier';

// import * as S3 from 'aws-sdk/clients/s3';
import S3 from 'aws-sdk/clients/s3.js';


export class fileManager {
    #wasabiEndpoint;

    /** @type {S3} */
    #s3;

    /**
     * @param {String} bucketName the id of the userv (pfp) or the channel id (message attatchement)
     */
    async #createBucket(bucketName) {
        this.#s3.createBucket({ Bucket: `ionwebchat-${bucketName}` }, function (err, data) {
            if (!err) {
                // console.log(data);  // successfull response
                // data: {
                //      Location: "http://examplebucket.s3.amazonaws.com/"
                // }
                return data;
            } else {
                console.log(err) // an error occurred
                return err;
            }
        });
    }


    /**
     * @param {Buffer} data
     */
    async uploadFile(channelId, filename, data) {
        if (!channelId) return { type: 1, code: 0, message: 'channelid not found' };
        if (!filename) return { type: 1, code: 1, message: 'filename not found' };
        if (!data) return { type: 1, code: 2, message: 'no data' };

        const res = await new Promise((resolve) => {
            return this.#s3.putObject({
                Body: data,
                Bucket: "ionwebchat",
                Key: `${channelId}/${filename}`
            }, (err, data) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                }
                else resolve(data);
            });
        });
        return (res) ? res.Body : null;
    }


    async getFile(channelId, filename) {
        if (!channelId) return { type: 1, code: 0, message: 'channelid not found' };
        if (!filename) return { type: 1, code: 1, message: 'filename not found' };

        const res = await new Promise(async (resolve) => {
            this.#s3.getObject({
                Bucket: "ionwebchat",
                Key: `${channelId}/${filename}`
            }, (err, data) => {
                if (err) {
                    if (err.code != 'NoSuchKey') console.log(err);
                    resolve(null);
                } else resolve(data);
            });
        });

        return (res) ? res.Body : null;
    }


    // FIXME
    upToCloudinary(channelId, filename, data) {
        try {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: "auto", public_id: `${channelId}/${filename}` },
                    (err, result) => {
                        if (result) {
                            console.log(result);
                            resolve(result);
                        }
                        else {
                            console.log(err);
                            resolve(null);
                        }
                    }
                );

                streamifier.createReadStream(data).pipe(stream);
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async getCloudinary(channelId, filename) {
        return await cloudinary.v2.search.expression(`${channelId}/${filename}`)
            .sort_by('public_id', 'desc')
            .max_results(1)
            .execute()
            .then(result => console.log(result));
    }


    constructor(accessKeyId, secretAccessKey, cloudinaryKey, cloudinarySecret) {
        this.#s3 = new S3({
            endpoint: 's3.us-east-005.backblazeb2.com ',
            region: 'us-east-2',
            accessKeyId,
            secretAccessKey
        });

        cloudinary.config({
            cloud_name: 'dnqdmeehq',
            api_key: cloudinaryKey,
            api_secret: cloudinarySecret
        });
    }
}
