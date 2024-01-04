//Contains all imports for the "server.js" file

import { WebSocketServer } from 'ws';
import { MongoClient, ServerApiVersion, GridFSBucket, MongoGridFSChunkError } from 'mongodb';
import { resumeSesion, createSession } from './initializations.js';
import { getMessages } from './getMessages.js';
import { getUidFromSid } from './utils/decodesid.js';
import { handleMessage, markDMAsRead } from './database/newMessage.js';
import { logout, logoutAllSessions } from './database/logout.js';
import { handleSocials } from './socials.js';
import { fileManager } from './database/media/init.js';

import express from 'express';
import cors from 'cors';
import { getConnection, validateSession } from './database/getConnection.js';
import { getPFP, uploadPFP } from './database/media/upload.js';
import bodyParser from 'body-parser';
import { createUConf, processUConf, recieveKeysInit, sendEmail } from './database/uConf.js';
import enableWs from 'express-ws';
import { toggleDM } from './database/logout.js';
import { systemMsgAll } from './admin/systemmsgall.js';
import { validateGDM, getDMID } from './groupDM.js';

// call stuff
import { initCallSockets } from './call.js'
import * as createMetaTags from './createMetaTags.js';

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
    logoutAllSessions,
    handleSocials,
    fileManager as wasabiManager,
    express,
    cors,
    validateSession, getConnection,
    getPFP, uploadPFP,
    bodyParser,
    createUConf,
    processUConf,
    sendEmail,
    enableWs,
    toggleDM,
    validateGDM, getDMID,
    systemMsgAll,
    initCallSockets,
    createMetaTags,
    recieveKeysInit
}