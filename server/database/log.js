import fs from 'fs';

export default async function log(connection, eventData) {
    //Write to a file for now, switch to the db later
    const dataInBufferForm = new Uint8Array(Buffer.from(JSON.stringify(eventData)));
    fs.writeFile('log.txt', dataInBufferForm, (err) => {
        if (err) {
            const dataInBufferForm = new Uint8Array(Buffer.from(JSON.stringify(err)));
            fs.writeFile('err.txt', dataInBufferForm, (e) => {/* err catch, do nothing */});
        }
    });
}