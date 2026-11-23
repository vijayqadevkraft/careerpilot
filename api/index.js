import { handleRequest } from '../web/server.js';

export default async function handler(req, res) {
  return handleRequest(req, res);
}
