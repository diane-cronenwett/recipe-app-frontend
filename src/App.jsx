import React, { useState, useEffect } from 'react';
import { Trash2, Plus, ChefHat, Package, Calendar, Upload, Loader } from 'lucide-react';

export default function RecipeInventoryApp() {
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [mealPlan, setMealPlan] = useState([]);
  const [activeTab, setActiveTab] = useState('recipes');
  const [newRecipe, setNewRecipe] = useState({ name: '', ingredients: [{ name: '', amount: '', unit: '' }] });
  const [newItem, setNewItem] = useState({ name: '', amount: '', unit: '', expiresIn: '' });
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [recipesRes, inventoryRes, mealPlanRes] = await Promise.all([
        fetch(`${API_BASE}/api/recipes`),
        fetch(`${API_BASE}/api/inventory`),
        fetch(`${API_BASE}/api/meal-plan`)
      ]);

      if (recipesRes.ok) setRecipes(await recipesRes.json());
      if (inventoryRes.ok) setInventory(await inventoryRes.json());
      if (mealPlanRes.ok) setMealPlan(await mealPlanRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add recipe
  const addRecipe = async () => {
    if (!newRecipe.name.trim()) return;

    const filtered = newRecipe.ingredients.filter(ing => ing.name.trim());
    
    try {
      const res = await fetch(`${API_BASE}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRecipe.name, ingredients: filtered })
      });

      if (res.ok) {
        const recipe = await res.json();
        setRecipes([recipe, ...recipes]);
        setNewRecipe({ name: '', ingredients: [{ name: '', amount: '', unit: '' }] });
      }
    } catch (error) {
      alert('Failed to add recipe');
    }
  };

  const addIngredientRow = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { name: '', amount: '', unit: '' }]
    });
  };

  const updateRecipeIngredient = (index, field, value) => {
    const updated = [...newRecipe.ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  // Add inventory item
  const addInventoryItem = async () => {
    if (!newItem.name.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (res.ok) {
        const item = await res.json();
        setInventory([item, ...inventory]);
        setNewItem({ name: '', amount: '', unit: '', expiresIn: '' });
      }
    } catch (error) {
      alert('Failed to add item');
    }
  };

  // Extract from recipe photo
  const handleRecipePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/extract-recipe`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.recipe) {
        setNewRecipe(data.recipe);
      }
    } catch (err) {
      alert('Failed to extract recipe from photo');
    } finally {
      setExtracting(false);
    }
  };

  // Extract from receipt photo
  const handleReceiptPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/extract-receipt`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const itemRes = await fetch(`${API_BASE}/api/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          if (itemRes.ok) {
            const newInventoryItem = await itemRes.json();
            setInventory([newInventoryItem, ...inventory]);
          }
        }
      }
    } catch (err) {
      alert('Failed to extract items from receipt');
    } finally {
      setExtracting(false);
    }
  };

  // Find matching recipes
  const findMatchingRecipes = () => {
    const inventoryNames = inventory.map(i => i.name.toLowerCase());
    const matches = recipes.map(recipe => {
      const matched = recipe.ingredients.filter(ing =>
        inventoryNames.some(inv => inv.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(inv))
      );
      return {
        recipe,
        matchCount: matched.length,
        totalIngredients: recipe.ingredients.length,
        percentage: Math.round((matched.length / recipe.ingredients.length) * 100)
      };
    }).filter(m => m.matchCount > 0).sort((a, b) => b.percentage - a.percentage);

    setSuggestedRecipes(matches);
  };

  // Remove recipe
  const removeRecipe = async (id) => {
    try {
      await fetch(`${API_BASE}/api/recipes/${id}`, { method: 'DELETE' });
      setRecipes(recipes.filter(r => r.id !== id));
    } catch (error) {
      alert('Failed to delete recipe');
    }
  };

  // Remove inventory item
  const removeInventoryItem = async (id) => {
    try {
      await fetch(`${API_BASE}/api/inventory/${id}`, { method: 'DELETE' });
      setInventory(inventory.filter(i => i.id !== id));
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  // Add to meal plan
  const addToMealPlan = async (recipe, day = 'Today') => {
    try {
      const res = await fetch(`${API_BASE}/api/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: recipe.id, recipeName: recipe.name, day })
      });

      if (res.ok) {
        const meal = await res.json();
        setMealPlan([meal, ...mealPlan]);
      }
    } catch (error) {
      alert('Failed to add to meal plan');
    }
  };

  // Remove from meal plan
  const removeFromMealPlan = async (id) => {
    try {
      await fetch(`${API_BASE}/api/meal-plan/${id}`, { method: 'DELETE' });
      setMealPlan(mealPlan.filter(m => m.id !== id));
    } catch (error) {
      alert('Failed to remove from meal plan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-orange-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ChefHat className="w-8 h-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-gray-800">Recipe & Inventory</h1>
          </div>
          <p className="text-gray-600">Manage recipes, track inventory, plan meals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {[
            { id: 'recipes', label: 'Recipes', icon: ChefHat },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'planner', label: 'Meal Plan', icon: Calendar }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-4 font-medium flex items-center gap-2 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Recipe</h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Recipe name"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">Ingredients</h3>
                  {newRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        value={ing.name}
                        onChange={(e) => updateRecipeIngredient(idx, 'name', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={ing.amount}
                        onChange={(e) => updateRecipeIngredient(idx, 'amount', e.target.value)}
                        className="w-20 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <select
                        value={ing.unit}
                        onChange={(e) => updateRecipeIngredient(idx, 'unit', e.target.value)}
                        className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Unit</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="cup">cup</option>
                        <option value="tsp">tsp</option>
                        <option value="tbsp">tbsp</option>
                      </select>
                    </div>
                  ))}
                  <button
                    onClick={addIngredientRow}
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add ingredient
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={addRecipe}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Save Recipe
                  </button>
                  <label className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Or upload photo</span>
                    <input type="file" accept="image/*" onChange={handleRecipePhoto} hidden />
                  </label>
                  {extracting && <span className="text-sm text-gray-600 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Extracting...</span>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-gray-800">Saved Recipes ({recipes.length})</h2>
              {recipes.length === 0 ? (
                <p className="text-gray-600">No recipes yet. Add one above.</p>
              ) : (
                recipes.map(recipe => (
                  <div key={recipe.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">{recipe.name}</h3>
                      <button
                        onClick={() => removeRecipe(recipe.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>{recipe.ingredients.length}</strong> ingredients
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                        <span key={idx} className="text-gray-700">
                          {ing.amount} {ing.unit} {ing.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Item</h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={newItem.amount}
                    onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Unit</option>
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="cup">cup</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Expires in (days)"
                    value={newItem.expiresIn}
                    onChange={(e) => setNewItem({ ...newItem, expiresIn: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={addInventoryItem}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                  <label className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Or scan receipt</span>
                    <input type="file" accept="image/*" onChange={handleReceiptPhoto} hidden />
                  </label>
                  {extracting && <span className="text-sm text-gray-600 flex items-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Extracting...</span>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Inventory ({inventory.length})</h2>
                <button
                  onClick={findMatchingRecipes}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
                >
                  Find Matching Recipes
                </button>
              </div>
              {inventory.length === 0 ? (
                <p className="text-gray-600">No items yet. Add some above.</p>
              ) : (
                inventory.map(item => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {item.amount} {item.unit} {item.expires_in && `• Expires in ${item.expires_in} days`}
                      </p>
                    </div>
                    <button
                      onClick={() => removeInventoryItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {suggestedRecipes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-gray-800">Recipes You Can Make</h2>
                {suggestedRecipes.map(match => (
                  <div key={match.recipe.id} className="bg-white rounded-lg shadow-sm p-4 border border-orange-200 bg-orange-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{match.recipe.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {match.matchCount} of {match.totalIngredients} ingredients available ({match.percentage}%)
                        </p>
                      </div>
                      <button
                        onClick={() => addToMealPlan(match.recipe)}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium text-sm"
                      >
                        Add to Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meal Plan Tab */}
        {activeTab === 'planner' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Meal Plan</h2>
              {mealPlan.length === 0 ? (
                <p className="text-gray-600">No meals planned yet. Add recipes from inventory matches.</p>
              ) : (
                <div className="space-y-3">
                  {mealPlan.map(meal => (
                    <div key={meal.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                        <h3 className="font-semibold text-gray-800">{meal.recipe_name}</h3>
                        <p className="text-sm text-gray-600">{meal.day}</p>
                      </div>
                      <button
                        onClick={() => removeFromMealPlan(meal.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}