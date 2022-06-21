import { PrismaClient } from "@prisma/client";
import express, { Application, Request, Response } from "express";

const prisma = new PrismaClient();
const app: Application = express();
const port: number = 3001;

app.get("/getrestaurants", async (req, res) => {
  console.log("trying to connect");
  await prisma.$connect();
  res.send(await getRestaurants());
  await prisma.$disconnect();
  console.log("connected");
});

async function getRestaurants() {
  return await prisma.restaurant.findMany({
    include: {
      tags: true,
      rates: true,
      food: {
        include: {
          meals: true,
        },
      },
    },
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
