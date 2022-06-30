import { PrismaClient } from "@prisma/client";
import express, { Application, Request, Response } from "express";

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
  img: string;
  rates: number;
}

app.get("/getRestaurants", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getRestaurants());
});

app.get("/getFeaturedRestaurants", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getFeaturedRestaurants());
});

app.get("/getAllRestaurants", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getAllRestaurants());
  await prisma.$disconnect();
});

app.get("/getRestaurantByName/:name", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getRestaurantByName(req.params.name));
  await prisma.$disconnect();
});

app.get("/getRestaurantById/:id", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getRestaurantInfoById(req.params.id));
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
    res.send(await getRestaurantById(id));
  } else {
    await prisma.$disconnect();
    res
      .status(418)
      .send({ error: req.body.restaurant.name + " restaurant already exists" });
  }
});

app.post("/updateRestaurant", async (req: Request, res: Response) => {
  await prisma.$connect();

  if (req.body.restaurant.name != undefined) {
    await updateRestaurant(req.body.restaurantId, req.body.restaurant);
  }
  if (req.body.restaurant.tags != undefined) {
    await updateTags(req.body.restaurantId, req.body.restaurant.tags);
  }
  if (req.body.restaurant.food != undefined) {
    await updateFood(req.body.restaurantId, req.body.restaurant.food);
  }
  await prisma.$disconnect();
  res.sendStatus(200);
});

app.post("/deleteRestaurant", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await deleteRestaurant(req.body.id));
  await prisma.$disconnect();
});

app.get(
  "/getProductsByRestaurantId/:id",
  async (req: Request, res: Response) => {
    await prisma.$connect();
    res.send(await getProductsByRestaurantId(req.params.id));
    await prisma.$disconnect();
  }
);

app.post("/addCategory", async (req: Request, res: Response) => {
  await prisma.$connect();
  await addCategory(req.body.restaurantId, req.body.category);
  res.send(await getProductsByRestaurantId(req.body.restaurantId))
  await prisma.$disconnect();
});

app.post("/updateCategory", async (req: Request, res: Response) => {
  await prisma.$connect();
  await req.body.products.forEach(async (product: any)=>{
    await updateCategory(product.id, product.category);
  });
  console.log(await getProductsByRestaurantId(req.body.restaurantId))
  res.send(await getProductsByRestaurantId(req.body.restaurantId))
  await prisma.$disconnect();
});

app.post("/deleteCategory", async (req: Request, res: Response) => {
  await prisma.$connect();
  await deleteFood(req.body.product);
  res.send(await getProductsByRestaurantId(req.body.product.restaurantId));
  await prisma.$disconnect();
});

app.get("/getProductList/:id", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getMealbyCategory(req.params.id));
  await prisma.$disconnect();
});

app.get("/getCategoryName/:id", async (req: Request, res: Response) => {
  await prisma.$connect();
  res.send(await getCategoryName(req.params.id));
  await prisma.$disconnect();
});

app.post("/addMeal", async (req: Request, res: Response) => {
  await prisma.$connect();
  await addMeal(req.body.categoryId, [req.body.meal])
  res.send(await getMealbyId(req.body.meal.id));
  await prisma.$disconnect();
});

app.post("/updateMeal", async (req: Request, res: Response) => {
  await prisma.$connect();
  await updateOneMeal(req.body.meal)
  res.send(await getMealbyId(req.body.meal.id));
  await prisma.$disconnect();
});

app.post("/deleteMeal", async (req: Request, res: Response) => {
  console.log(req.body.meal)
  await prisma.$connect();
  await deleteMeal(req.body.meal)
  res.send(await getMealbyCategory(req.body.meal.foodId));
  await prisma.$disconnect();
});

app.post("/addOrder", async (req: Request, res: Response) => {
  await prisma.$connect();
  const order = await addOrder(req.body);
  await prisma.$disconnect();
  res.send(order);
});

async function getProductsByRestaurantId(restaurantId: string) {
  return await prisma.food.findMany({
    where: {
      restaurantId: restaurantId,
      deleted: false,
    },
    include: {
      meals: {
        where: {
          deleted: false,
        },
      },
    },
  });
}

async function getRestaurants() {
  return await prisma.restaurant.findMany({
    where: {
      deleted: false,
    },
  });
}

async function getFeaturedRestaurants() {
  return await prisma.restaurant.findMany({
    where: {
      featured: true,
      deleted: false,
    },
  });
}

async function getAllRestaurants() {
  return await prisma.restaurant.findMany({
    include: {
      tags: {
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

async function getRestaurantById(id: string) {
  return await prisma.restaurant.findFirst({
    where: {
      id: id,
    },
    include: {
      tags: {
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

async function getRestaurantInfoById(id: string) {
  return await prisma.restaurant.findFirst({
    where: {
      id: id,
    },
  });
}

async function getRestaurantByName(name: string) {
  return await prisma.restaurant.findUnique({
    where: {
      name: name,
    },
    include: {
      tags: { where: { deleted: false } },
      food: {
        include: {
          meals: {
            where: {
              deleted: false,
            },
          },
        },
        where: {
          deleted: false,
        },
      },
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
      img: restaurant.img,
      featured: false,
      rates: restaurant.rates,
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
      img: restaurant.img,
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

async function getCategoryName(id: string){
  return await prisma.food.findFirst({
    where:{
      id: id
    },
    select: {
      category: true
    }
  })
}

async function addCategory(restaurantId: string, category: string){
  return await prisma.food.create({
    data: {
      restaurantId: restaurantId,
      category: category,
    },
  });
}

async function updateCategory(id: string, category: string){
  return await prisma.food.update({
    where: {
      id: id
    },
    data: {
      category: category,
    },
  });
}

async function getMealbyId(id: string){
  return await prisma.meal.findFirst({
    where: {
      id: id,
      deleted: false
    }
  })
}

async function getMealbyCategory(idCategory: string){
  return await prisma.meal.findMany({
    where: {
      foodId: idCategory,
      deleted: false,
    }
  })
}

async function addFood(id: string, foods: Food[]) {
  foods.forEach(async (food) => {
    const response = await prisma.food.create({
      data: {
        restaurantId: id,
        category: food.category,
      },
    });
    if(food.meals){
      await updateMeal(response.id, food.meals);
    }
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
  food.meals.forEach(async (meal: Meal) => {
    await deleteMeal(meal);
  });
}

async function deleteFoodById(id: string) {
  const response = await prisma.food.update({
    where: {
      id: id,
    },
    data: {
      deleted: true,
    },
  });
  //NEED TO DELETE MEALS AFTER THAT
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
  food.meals.forEach(async (meal: Meal) => {
    await undeleteMeal(meal);
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

async function updateOneMeal(meal: any){
  return await prisma.meal.update({
    where: {
      id: meal.id
    },
    data: {
      name: meal.name,
      price: meal.price,
      info: meal.info,
      img: meal.img
    },
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

async function addOrder(order: any) {
  return await prisma.order.create({
    data: {
      meals: order.meals,
      total: order.total,
    },
  });
}

app.listen(port, () => {
  console.log(`VEAT MONGO API listening on port ${port}`);
});
