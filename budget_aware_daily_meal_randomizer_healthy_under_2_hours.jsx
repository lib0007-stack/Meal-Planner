import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// ---------------------------
// Local Recipe Pool (fallback first)
// ---------------------------
const localRecipes = {
  breakfast: [
    { id: 1, name: "Oatmeal with Fruit", diet: ["vegetarian", "gluten-free"], budget: "$", instructions: "Cook oats, top with fruit.", image: "https://via.placeholder.com/300x200?text=Oatmeal" },
    { id: 2, name: "Avocado Toast", diet: ["vegetarian"], budget: "$$", instructions: "Toast bread, mash avocado, season.", image: "https://via.placeholder.com/300x200?text=Avocado+Toast" }
  ],
  lunch: [
    { id: 3, name: "Chicken Salad", diet: ["high-protein"], budget: "$$", instructions: "Mix grilled chicken with greens.", image: "https://via.placeholder.com/300x200?text=Chicken+Salad" }
  ],
  dinner: [
    { id: 4, name: "Veggie Stir Fry", diet: ["vegetarian", "gluten-free"], budget: "$", instructions: "Stir fry vegetables, add sauce.", image: "https://via.placeholder.com/300x200?text=Veggie+Stir+Fry" }
  ],
  dessert: [
    { id: 5, name: "Fruit Salad", diet: ["vegetarian", "gluten-free"], budget: "$", instructions: "Chop seasonal fruits, mix.", image: "https://via.placeholder.com/300x200?text=Fruit+Salad" }
  ]
};

// ---------------------------
// Spoonacular API Fetcher
// ---------------------------
async function fetchFromSpoonacular(mealType, diet, budget) {
  const apiKey = "6c08a04a699a9843807fc8e5c16bbf82269c0bf2";
  let tags = [];

  if (diet.includes("vegetarian")) tags.push("vegetarian");
  if (diet.includes("gluten-free")) tags.push("gluten-free");
  if (diet.includes("high-protein")) tags.push("high-protein");

  let budgetTag = "";
  if (budget === "$") budgetTag = "cheap";

  const url = `https://api.spoonacular.com/recipes/random?number=1&tags=${[mealType, ...tags, budgetTag].join(",")}&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.recipes && data.recipes.length > 0) {
      const recipe = data.recipes[0];
      return {
        id: recipe.id,
        name: recipe.title,
        instructions: recipe.instructions || "No instructions provided.",
        ingredients: recipe.extendedIngredients.map((ing) => ing.original),
        pricePerServing: recipe.pricePerServing,
        readyInMinutes: recipe.readyInMinutes,
        sourceUrl: recipe.sourceUrl,
        image: recipe.image
      };
    }
  } catch (err) {
    console.error("Error fetching Spoonacular recipe:", err);
  }
  return null;
}

// ---------------------------
// Utility Functions
// ---------------------------
function pickLocalRecipe(mealType, diet, budget, usedIds) {
  const options = localRecipes[mealType].filter(
    (r) => !usedIds.includes(r.id) &&
      (!diet.length || diet.every((d) => r.diet.includes(d))) &&
      (!budget || r.budget === budget)
  );
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

async function getRecipe(mealType, diet, budget, usedIds) {
  const localRecipe = pickLocalRecipe(mealType, diet, budget, usedIds);
  if (localRecipe) return localRecipe;
  return await fetchFromSpoonacular(mealType, diet, budget);
}

// ---------------------------
// Main Component
// ---------------------------
export default function MealPlanner() {
  const [budget, setBudget] = useState("$$");
  const [diet, setDiet] = useState([]);

  const [usedIds, setUsedIds] = useState(() => {
    const savedIds = JSON.parse(localStorage.getItem("usedIds")) || [];
    const lastReset = localStorage.getItem("lastReset");
    const now = new Date().getTime();

    if (!lastReset || now - parseInt(lastReset) > 7 * 24 * 60 * 60 * 1000) {
      localStorage.setItem("lastReset", now.toString());
      return [];
    }
    return savedIds;
  });

  useEffect(() => {
    localStorage.setItem("usedIds", JSON.stringify(usedIds));
  }, [usedIds]);

  const [meals, setMeals] = useState({});

  const generateMeals = async () => {
    const mealTypes = ["breakfast", "lunch", "dinner", "dessert"];
    let newMeals = {};

    for (const type of mealTypes) {
      const recipe = await getRecipe(type, diet, budget, usedIds);
      if (recipe) {
        newMeals[type] = recipe;
        setUsedIds((prev) => [...prev, recipe.id]);
      }
    }
    setMeals(newMeals);
  };

  return (
    <div className="p-6 grid gap-6">
      <h1 className="text-3xl font-bold">Daily Meal Planner 🍽️</h1>

      <div>
        <p>Budget: {budget}</p>
        <Slider
          min={1}
          max={3}
          step={1}
          defaultValue={[2]}
          onValueChange={(val) => setBudget(["$", "$$", "$$$"][val[0] - 1])}
        />
      </div>

      <div className="flex gap-4">
        {[
          { label: "Vegetarian", value: "vegetarian" },
          { label: "Gluten-Free", value: "gluten-free" },
          { label: "High-Protein", value: "high-protein" }
        ].map((filter) => (
          <label key={filter.value}>
            <input
              type="checkbox"
              value={filter.value}
              onChange={(e) => {
                setDiet((prev) =>
                  e.target.checked ? [...prev, filter.value] : prev.filter((d) => d !== filter.value)
                );
              }}
            />
            {filter.label}
          </label>
        ))}
      </div>

      <Button onClick={generateMeals}>Shuffle Meals</Button>

      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(meals).map(([mealType, recipe]) => (
          <Card key={mealType}>
            <CardContent>
              {recipe.image && (
                <img src={recipe.image} alt={recipe.name} className="w-full h-40 object-cover rounded-lg mb-2" />
              )}
              <h2 className="text-xl font-semibold">{mealType.toUpperCase()}</h2>
              <h3 className="text-lg">{recipe.name}</h3>
              {recipe.readyInMinutes && <p>⏱ {recipe.readyInMinutes} mins</p>}
              {recipe.pricePerServing && <p>💲 ${(recipe.pricePerServing / 100).toFixed(2)} per serving</p>}
              {recipe.ingredients && (
                <ul>
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx}>{ing}</li>
                  ))}
                </ul>
              )}
              <div dangerouslySetInnerHTML={{ __html: recipe.instructions }} />
              {recipe.sourceUrl && (
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  Full Recipe
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
