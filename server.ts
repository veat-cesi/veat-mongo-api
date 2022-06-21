import { PrismaClient } from "@prisma/client";
import express, { Application, Request, response, Response } from "express";

const prisma = new PrismaClient();
const app: Application = express();
const port: number = 3001;

interface Tag {
  restaurantId?: string;
  name: string;
}

interface Meal {
  foodId?: string;
  name: string;
  price: number;
  info: string;
  img: string;
}

interface Food {
  restaurantId?: string;
  category: string;
  meals: Meal[];
}

interface Restaurant {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  about: string;
}

app.get("/getAllRestaurants", async (req, res) => {
  await prisma.$connect();
  res.send(await getAllRestaurants());
  await prisma.$disconnect();
});

app.get("/getRestaurantByName", async (req, res) => {
  await prisma.$connect();
  res.send(await getRestaurantByName(req.body.name));
  await prisma.$disconnect();
});

app.post("/addRestaurant", async (req, res) => {
  await prisma.$connect();
  const id = await addRestaurant(req.body.restaurant);
  Tags.forEach((element) => {
    element.restaurantId = id;
  });
  Food.forEach((element) => {
    element.restaurantId = id;
  });
  await addTags(Tags);
  await addFood(Food);
  await prisma.$disconnect();
  res.redirect("/getAllRestaurants");
});

app.post("/updateRestaurant", async (req, res) => {
  await prisma.$connect();
  await updateRestaurant(req.body.restaurant);
  await prisma.$disconnect();
  res.redirect("/getAllRestaurants");
});

app.post("/deleteRestaurant", async (req, res) => {
  await prisma.$connect();
  res.send(await deleteRestaurant(req.body.id));
  await prisma.$disconnect();
});

async function getAllRestaurants() {
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

async function getRestaurantByName(name: string) {
  return await prisma.restaurant.findUnique({
    where: {
      name: name,
    },
  });
}

async function addTags(tags: Tag[]) {
  await prisma.tag.createMany({
    data: tags,
  });
}

async function addFood(food: Food[]) {
  food.forEach(async (element) => {
    const response = await prisma.food.create({
      data: {
        restaurantId: element.restaurantId,
        category: element.category,
      },
    });
    element.meals.forEach(async (meal) => {
      await prisma.meal.create({
        data: {
          foodId: response.id,
          name: meal.name,
          price: meal.price,
          info: meal.info,
          img: meal.img,
        },
      });
    });
  });
}

async function addRestaurant(restaurant: Restaurant) {
  const response = await prisma.restaurant.create({
    data: {
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      city: restaurant.city,
      address: restaurant.address,
      about: restaurant.about,
    },
  });
  return response.id;
}

async function updateRestaurant(restaurant: Restaurant) {
  const response = await prisma.restaurant.update({
    where: {
      name: restaurant.name,
    },
    data: {
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      city: restaurant.city,
      address: restaurant.address,
      about: restaurant.about,
    },
  });
  return response.id;
}

async function deleteRestaurant(id: string) {
  return await prisma.restaurant.delete({
    where: {
      id: id,
    },
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

const Vapiano: Restaurant = {
  name: "Vapiano",
  email: "contact@vapiano.com",
  phone: "012345789",
  city: "Bordeaux",
  address: "264 Boulevard Godard",
  about:
    "The home of handmade fresh pasta, thin crust pizza, protein packed salads, homemade sauces and dressings too. Choose your pasta shape and add any extras you like.",
};

const Tags: Tag[] = [
  { name: "Italian" },
  { name: "Pasta" },
  { name: "Pizza" },
  { name: "Salads" },
];

const Food: Food[] = [
  {
    category: "Pasta 🍝",
    meals: [
      {
        name: "Arrabbiata",
        price: 9.35,
        info: "Tomato sauce, chilli, garlic, and onions",
        img: "https://devdactic.fra1.digitaloceanspaces.com/foodui/5.png",
      },
      {
        name: "Pomodoro e Mozzarella",
        price: 10.75,
        info: "Tomato sauce, onions, mozzarella",
        img: "https://devdactic.fra1.digitaloceanspaces.com/foodui/6.png",
      },
    ],
  },
];

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
