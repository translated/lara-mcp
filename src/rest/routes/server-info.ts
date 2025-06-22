import fs from "node:fs";
import path from "node:path";

import express from "express";
import { RestServer } from "../server.js";

const buildInfoJson: string = fs.readFileSync(
  path.join(import.meta.dirname, "..", "..", "..", "package.json"),
  "utf8"
);

type BuildInfo = {
  name: string;
  version: string;
};

export const BuildInfo: BuildInfo = JSON.parse(buildInfoJson);

export default function serverInfoRouter(rest: RestServer): express.Router {
  const router = express.Router();

  router.all("/", (_req, res) => {
    rest.send(res, { version: BuildInfo.version });
  });

  return router;
}
