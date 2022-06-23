import { PrismaClient } from "@prisma/client";
import e from "express";
import express, { Application, Request, response, Response } from "express";

var bodyParser = require("body-parser");

const prisma = new PrismaClient();
const app: Application = express();
const port: number = 3001;

app.use(bodyParser.json());

interface Tag {
  id?: string;
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

app.get("/getAllRestaurants", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getAllRestaurants());
  await prisma.$disconnect();
});

app.get("/getRestaurantByName", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getRestaurantByName(req.body.name));
  await prisma.$disconnect();
});

app.post("/addRestaurant", async (req: Request, res: Response) => {
  await prisma.$connect();
  if ((await getRestaurantByName(req.body.restaurant.name)) == null) {
    const id = await addRestaurant(req.body.restaurant);
    req.body.restaurant.tags.forEach((element: Tag) => {
      element.restaurantId = id;
    });
    req.body.restaurant.food.forEach((element: Food) => {
      element.restaurantId = id;
    });
    await addTags(req.body.restaurant.tags);
    await addFood(id, req.body.restaurant.food);
    await prisma.$disconnect();
    res.status(200);
  } else {
    await prisma.$disconnect();
    res
      .status(418)
      .send({ error: req.body.restaurant.name + " restaurant already exists" });
  }
});

app.post("/updateRestaurant", async (req: Request, res: Response) => {
  await prisma.$connect();
  await updateRestaurant(req.body.restaurantId, req.body.restaurant);
  await updateTags(req.body.restaurantId, req.body.restaurant.tags);
  await updateFood(req.body.restaurantId, req.body.restaurant.food);
  await prisma.$disconnect();
  res.redirect("/getAllRestaurants");
});

app.post("/deleteRestaurant", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await deleteRestaurant(req.body.id));
  await prisma.$disconnect();
});

async function getAllRestaurants() {
  return await prisma.restaurant.findMany({
    include: {
      tags: {
        where: {
          deleted: false,
        },
      },
      rates: {
        where: {
          deleted: false,
        },
      },
      food: {
        where: {
          deleted: false,
        },
        include: {
          meals: {
            where: {
              deleted: false,
            },
          },
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

async function updateRestaurant(id: string, restaurant: Restaurant) {
  await prisma.restaurant.update({
    where: {
      id: id,
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

async function getTags(restaurantId: string) {
  return await prisma.tag.findMany({
    where: {
      restaurantId: restaurantId,
    },
  });
}

async function addTags(tags: Tag[]) {
  await prisma.tag.createMany({
    data: tags,
  });
}

async function updateTags(restaurantId: string, tags: Tag[]) {
  const oldTags = await getTags(restaurantId);
  tags.forEach(async (tag) => {
    var found = false;
    var deleted = false;
    oldTags.forEach((oldTag) => {
      if (tag.name === oldTag.name) {
        found = true;
        if (oldTag.deleted == true) {
          deleted = true;
        }
      }
    });
    if (found === false) {
      tag.restaurantId = restaurantId;
      await addTags([tag]);
    }
    if (deleted) {
      var tagToUndelete = await prisma.tag.findFirst({
        where: {
          restaurantId: restaurantId,
          name: tag.name,
        },
      });
      await undeleteTag(tagToUndelete);
    }
  });
  oldTags.forEach(async (oldTag) => {
    var found = false;
    tags.forEach((tag) => {
      if (oldTag.name === tag.name) {
        found = true;
      }
    });
    if (found === false) {
      await deleteTag(oldTag);
    }
  });
}

async function deleteTag(tag: any) {
  await prisma.tag.update({
    where: {
      id: tag.id,
    },
    data: {
      deleted: true,
    },
  });
}

async function undeleteTag(tag: any) {
  await prisma.tag.update({
    where: {
      cuid: tag.cuid,
    },
    data: {
      deleted: false,
    },
  });
}

async function getFood(restaurantId: string) {
  return await prisma.food.findMany({
    where: {
      restaurantId: restaurantId,
    },
  });
}

async function addFood(id: string, foods: Food[]) {
  foods.forEach(async (food) => {
    const response = await prisma.food.create({
      data: {
        restaurantId: id,
        category: food.category,
      },
    });
    updateMeal(response.id, food.meals);
  });
}

async function updateFood(restaurantId: string, foods: Food[]) {
  const oldFoods = await getFood(restaurantId);
  foods.forEach(async (food) => {
    var found = false;
    var deleted = false;
    oldFoods.forEach((oldFood) => {
      if (food.category === oldFood.category) {
        found = true;
        if (oldFood.deleted == true) {
          deleted = true;
        }
      }
    });
    if (found === false) {
      food.restaurantId = restaurantId;
      await addFood(restaurantId, [food]);
    }
    if (deleted) {
      var foodToUndelete = await prisma.food.findFirst({
        where: {
          restaurantId: restaurantId,
          category: food.category,
        },
        include: {
          meals: true,
        },
      });
      await undeleteFood(foodToUndelete);
    }
  });
  oldFoods.forEach(async (oldFood) => {
    var found = false;
    foods.forEach((food) => {
      if (oldFood.category === food.category) {
        found = true;
      }
    });
    if (found === false) {
      var foodToDelete = await prisma.food.findFirst({
        where: {
          restaurantId: restaurantId,
          category: oldFood.category,
        },
        include: {
          meals: true,
        },
      });
      await deleteFood(foodToDelete);
    }
  });
}

async function deleteFood(food: any) {
  await prisma.food.update({
    where: {
      id: food.id,
    },
    data: {
      deleted: true,
    },
  });
  food.meals.forEach((meal: Meal) => {
    deleteMeal(meal);
  });
}

async function undeleteFood(food: any) {
  await prisma.food.update({
    where: {
      id: food.id,
    },
    data: {
      deleted: false,
    },
  });
  food.meals.forEach((meal: Meal) => {
    undeleteMeal(meal);
  });
}

async function getMeal(foodId: string) {
  return await prisma.meal.findMany({
    where: {
      foodId: foodId,
    },
  });
}

async function addMeal(id: string, meals: Meal[]) {
  meals.forEach(async (meal) => {
    await prisma.meal.create({
      data: {
        foodId: id,
        name: meal.name,
        price: meal.price,
        info: meal.info,
        img: meal.img,
      },
    });
  });
}

async function updateMeal(foodId: string, meals: Meal[]) {
  const oldMeals = await getMeal(foodId);
  if (!oldMeals) {
    addMeal(foodId, meals);
  } else {
    meals.forEach(async (meal) => {
      var found = false;
      var deleted = false;
      oldMeals.forEach((oldMeal) => {
        if (meal.name === oldMeal.name) {
          found = true;
          if (oldMeal.deleted == true) {
            deleted = true;
          }
        }
      });
      if (found === false) {
        meal.foodId = foodId;
        await addMeal(foodId, [meal]);
      }
      if (deleted) {
        var mealToUndelete = await prisma.meal.findFirst({
          where: {
            foodId: foodId,
            name: meal.name,
          },
        });
        await undeleteMeal(mealToUndelete);
      }
    });
    oldMeals.forEach(async (oldMeal) => {
      var found = false;
      meals.forEach((meal) => {
        if (oldMeal.name === meal.name) {
          found = true;
        }
      });
      if (found === false) {
        var mealToDelete = await prisma.meal.findFirst({
          where: {
            foodId: foodId,
            name: oldMeal.name,
          },
        });
        await deleteMeal(mealToDelete);
      }
    });
  }
}

async function deleteMeal(meal: any) {
  await prisma.meal.update({
    where: {
      id: meal.id,
    },
    data: {
      deleted: true,
    },
  });
}

async function undeleteMeal(meal: any) {
  await prisma.meal.update({
    where: {
      id: meal.id,
    },
    data: {
      deleted: false,
    },
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
