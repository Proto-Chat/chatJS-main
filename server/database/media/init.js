import * as AWS from 'aws-sdk'
const {Endpoint} = AWS;
import fs from 'fs';
// import * as S3 from 'aws-sdk/clients/s3';
import S3 from 'aws-sdk/clients/s3.js';


export class wasabiManager {
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
        if (!channelId) return {type: 1, code: 0, message: 'channelid not found'};
        if (!filename) return {type: 1, code: 1, message: 'filename not found'};
        if (!data) return {type: 1, code: 2, message: 'no data'};
        
        return this.#s3.putObject({
            Body: data,
            Bucket: "ionwebchat",
            Key: `${channelId}/${filename}`
        }, (err, data) => {
            if (err) {
                console.log(err);
                return null;
            }
            else return data;
        });
    }


    async getFile(channelId, filename) {
        if (!channelId) return {type: 1, code: 0, message: 'channelid not found'};
        if (!filename) return {type: 1, code: 1, message: 'filename not found'};

        const res = await new Promise(async (resolve) => {
            this.#s3.getObject({
                Bucket: "ionwebchat",
                Key: `${channelId}/${filename}`
            }, (err, data) => {
                if (err) {
                    console.log(err);
                    resolve(null);
                } else resolve(data);
            });
        });

        return (res) ? res.Body : null;
    }

    constructor(accessKeyId, secretAccessKey, mongoconnection) {
        // this.#wasabiEndpoint = new Endpoint('s3.us-east-2.wasabisys.com');
        this.#s3 = new S3({
            endpoint: 's3.us-east-2.wasabisys.com',//this.#wasabiEndpoint,
            region: 'us-east-2',
            accessKeyId,
            secretAccessKey
        });
    }
}