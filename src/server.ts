import { Db } from "mongodb";
import * as core from "express-serve-static-core";
import express from "express";
import * as dotenv from "dotenv";
import * as gamesController from "./controllers/games.controller";
import * as nunjucks from "nunjucks";
import * as platformsController from "./controllers/platforms.controller";
import initDb from "../utils/initDatabase";
import GameModel, { Game } from "./models/gameModel";
import PlatformModel, { Platform } from "./models/platformModel";
import bodyParser from "body-parser";

dotenv.config();

const clientWantsJson = (request: express.Request): boolean => request.get("accept") === "application/json";

const jsonParser = bodyParser.json();
const formParser = bodyParser.urlencoded({ extended: true });

export function makeApp(db: Db): core.Express {
  const app = express();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.use("/assets", express.static("public"));
  app.set("view engine", "njk");

  const platformModel = new PlatformModel(db.collection<Platform>("platforms"));
  const gameModel = new GameModel(db.collection<Game>("games"));

  //HOME PAGE
  app.get("/", (_request, response) => response.render("pages/home"));

  //PLATFORMS
  app.get("/platforms", platformsController.index(platformModel));
  app.post("/platforms", jsonParser, formParser, platformsController.create(platformModel));

  app.get("/platforms/:slug", platformsController.show(platformModel));
  app.put("/platforms/:slug", jsonParser, platformsController.update(platformModel));
  app.post("/platforms/delete/:slug", jsonParser, formParser, platformsController.destroy(platformModel));

  app.post("/platforms/:id", formParser, platformsController.update(platformModel));

  //GAME
  app.get("/platforms/:slug/games", gamesController.list(gameModel));
  app.get("/games", gamesController.index(gameModel));
  app.get("/games/:slug", gamesController.show(gameModel));
  app.post("/games", jsonParser, gamesController.create(gameModel, platformModel));
  app.put("/games/:slug", jsonParser, gamesController.update(gameModel));
  app.delete("/games/:slug", jsonParser, gamesController.destroy(gameModel));

  app.get("/*", (request, response) => {
    if (clientWantsJson(request)) {
      response.status(404).json({ error: "Not Found" });
    } else {
      response.status(404).render("pages/not-found");
    }
  });

  return app;
}

initDb()
  .then(async (client) => {
    const app = makeApp(client.db());

    app.listen(process.env.PORT, () => {
      console.log(`listen on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(console.error);
