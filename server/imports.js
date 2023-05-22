//Contains all imports for the "server.js" file

import { WebSocketServer } from 'ws';
import { MongoClient, ServerApiVersion, GridFSBucket, MongoGridFSChunkError } from 'mongodb';
import { resumeSesion, createSession } from './initializations.js';
import { getMessages } from './getMessgaes.js';
import { getUidFromSid } from './utils/decodesid.js';
import { handleMessage, markDMAsRead } from './database/newMessage.js';
import { logout } from './database/logout.js';
import { handleSocials } from './socials.js';
import { wasabiManager } from './database/media/init.js';

import express from 'express';
import cors from 'cors';
import { validateSession } from './database/getConnection.js';
import { getPFP, uploadPFP } from './database/media/upload.js';
import bodyParser from 'body-parser';
import { createUConf, processUConf } from './database/uConf.js';
import enableWs from 'express-ws';
import { toggleDM } from './database/logout.js';

// import configImp from '../config.json' assert { type: 'json' };
var configImp = null;

export {
    WebSocketServer,
    MongoClient, ServerApiVersion, GridFSBucket, MongoGridFSChunkError,
    configImp,
    resumeSesion, createSession,
    getMessages,
    getUidFromSid,
    handleMessage, markDMAsRead,
    logout,
    handleSocials,
    wasabiManager,
    express,
    cors,
    validateSession,
    getPFP, uploadPFP,
    bodyParser,
    createUConf,
    processUConf,
    enableWs,
    toggleDM,
}