import { SOCKET_URL } from './config/api';

const URL = SOCKET_URL;

export const socket = io(URL, {
    autoConnect: false
});
