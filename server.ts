import { PrismaClient } from "@prisma/client";
import express, { Application, Request, Response } from "express";

const prisma = new PrismaClient();
const app: Application = express();
const port: number = 3001;

app.get("/getrestaurants", async (req, res) => {
  await prisma.$connect();
  res.send(await getRestaurants());
  await prisma.$disconnect();
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
