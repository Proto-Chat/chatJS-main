// this file contains all the codes the client sends TO the server
const NEW_CONNECTION = {
    CODE: 0,
    OPS: {
        INITIAL_LOGIN: 0,
        ACCOUNT_CREATION: 1,
        CONFIRMATION_CODE: 2,
    }
};

const RESUME_SESSION = {
    CODE: 1,
    OPS: {
        REQUEST_EXCEPT_IMAGES: 0,
    }
};

const LOGOUT = {
    CODE: 2,
    OPS: {
        ALL_SESSIONS: 0,
        THIS_SESSION: 1,
    }
};

const MESSAGES_WITH_USER = {
    CODE: 3,
    OPS: {
        GET_MESSAGES: 0,
        CLOSED_DM: 1,
        OPEN_DM: 2,
        DM_READ: 3,
    }
};

const SOCIALS = {
    CODE: 4,
    OPS: {
        GET_SOCIALS: 0,
        SEND_FRIEND_REQUEST: 1,
        FRIEND_REQUEST_ACCEPTED: 2,
        FRIEND_REQUEST_REJECTED: 3,
        FRIEND_REQUEST_CANCELLED: 4,
        SEND_PROFILE_EDIT_REQUEST: 5,
        REMOVE_FRIEND: 6,
        GET_FRIENDS: 7,
        CREATE_GROUP_DM: 8,
        REMOVE_FROM_GROUP_DM: 9,
    }
};

const MESSAGE = {
    CODE: 5,
    OPS: {
        RECEIVED: 0,
        DELETED: 1,
        EDITED: 2,
        IMAGE: 3
    }
};

const SERVER = {
    CODE: 6,
    OPS: {
        CREATE_SERVER: 0,
        EDIT_SERVER: 1,
        CREATE_CHANNEL: 2,
        GET_CHANNEL: 4,
        SEND_MESSAGE: 5,
        EDIT_MESSAGE: 6,
        DELETE_MESSAGE: 7,
        EDIT_CHANNEL: 8,
        DELETE_CHANNEL: 9,
        USER_ACTION: {
            CODE: 10,
            ACTION_CODES: {
                KICK: 0,
                BAN: 1,
                UNBAN: 2,
                GET_BANNED: 3
            }
        }
    }
};

const SECURITY = {
    CODE: 7,
    OPS: {
        NEW_KEYS_CREATED: 0,
    }
};

const PING = 10;

export const SERVERMACROS = {
    NEW_CONNECTION,
    RESUME_SESSION,
    LOGOUT,
    MESSAGES_WITH_USER,
    SOCIALS,
    MESSAGE,
    SERVER,
    SECURITY,
    PING
}