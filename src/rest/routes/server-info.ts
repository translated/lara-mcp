import express from "express";
import { RestServer } from "#rest/server";
import { PACKAGE_VERSION } from "../../version.js";

export default function serverInfoRouter(rest: RestServer): express.Router {
  const router = express.Router();

  router.all("/", (_req, res) => {
    rest.send(res, { version: PACKAGE_VERSION });
  });

  return router;
}
