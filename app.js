/**
 * ==================== RECIPE AI - MAIN APPLICATION ====================
 * A comprehensive meal planning and recipe generation application
 * with AI integration, local storage persistence, and responsive design.
 */

// ==================== API CONFIGURATION ====================
// TODO: Replace with your actual API key
const API_CONFIG = {
    // OpenAI API Configuration
    apiKey: 'YOUR_API_KEY_HERE', // <-- ADD YOUR OPENAI API KEY HERE
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo', // or 'gpt-4' for better results

    // Alternative: Anthropic Claude API
    // apiKey: 'YOUR_ANTHROPIC_API_KEY_HERE',
    // endpoint: 'https://api.anthropic.com/v1/messages',
    // model: 'claude-3-sonnet-20240229',
};

// ==================== APPLICATION STATE ====================
// Central state management for the application
const AppState = {
    currentTab: 'generator',
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    mealPlan: {},
    shoppingList: {},
    favorites: [],
    currentRecipe: null,
    filters: {
        dietary: [],
        difficulty: 2,
        servings: 2,
        cookTime: 'any',
        leftoverMode: false
    }
};

// ==================== DOM ELEMENTS ====================
// Cache DOM elements for better performance
const DOM = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
    mobileNav: document.querySelector('.mobile-nav'),

    // Filters
    filtersSidebar: document.querySelector('.filters-sidebar'),
    filtersContent: document.querySelector('.filters-content'),
    toggleFiltersBtn: document.querySelector('.toggle-filters-btn'),
    dietaryCheckboxes: document.querySelectorAll('input[name="dietary"]'),
    difficultySlider: document.getElementById('difficulty'),
    servingsInput: document.getElementById('servings'),
    cookTimeSelect: document.getElementById('cook-time'),
    leftoverModeToggle: document.getElementById('leftover-mode'),

    // Recipe Generator
    ingredientsInput: document.getElementById('ingredients-input'),
    generateRecipeBtn: document.getElementById('generate-recipe-btn'),
    whatsMissingBtn: document.getElementById('whats-missing-btn'),
    missingIngredients: document.getElementById('missing-ingredients'),
    missingList: document.getElementById('missing-list'),
    recipeResult: document.getElementById('recipe-result'),
    stepByStepToggle: document.getElementById('step-by-step-mode'),

    // Meal Plan
    generateMealPlanBtn: document.getElementById('generate-meal-plan-btn'),
    calendarGrid: document.getElementById('calendar-grid'),
    currentMonthDisplay: document.getElementById('current-month'),
    prevMonthBtn: document.getElementById('prev-month'),
    nextMonthBtn: document.getElementById('next-month'),
    tipsList: document.getElementById('tips-list'),

    // Shopping List
    shoppingListContainer: document.getElementById('shopping-list-container'),
    clearCheckedBtn: document.getElementById('clear-checked'),
    copyListBtn: document.getElementById('copy-list'),

    // Favorites
    favoritesContainer: document.getElementById('favorites-container'),

    // Modal
    modal: document.getElementById('recipe-modal'),
    modalOverlay: document.querySelector('.modal-overlay'),
    modalClose: document.querySelector('.modal-close'),
    modalStepByStepToggle: document.getElementById('modal-step-by-step-mode'),

    // Loading & Toast
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    toastContainer: document.getElementById('toast-container')
};

// ==================== INITIALIZATION ====================
// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize all application components
 */
function initializeApp() {
    loadFromLocalStorage();
    setupEventListeners();
    renderCalendar();
    renderFavorites();
    renderShoppingList();
    updateFiltersFromState();
}

// ==================== EVENT LISTENERS ====================
/**
 * Set up all event listeners for the application
 */
function setupEventListeners() {
    // Navigation tabs
    DOM.navTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Mobile menu
    DOM.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);

    // Filter toggles (mobile)
    DOM.toggleFiltersBtn?.addEventListener('click', toggleFilters);

    // Dietary checkboxes
    DOM.dietaryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateDietaryFilters);
    });

    // Other filter inputs
    DOM.difficultySlider?.addEventListener('input', (e) => {
        AppState.filters.difficulty = parseInt(e.target.value);
        saveToLocalStorage();
    });

    DOM.servingsInput?.addEventListener('change', (e) => {
        AppState.filters.servings = Math.max(1, Math.min(12, parseInt(e.target.value) || 2));
        e.target.value = AppState.filters.servings;
        saveToLocalStorage();
    });

    DOM.cookTimeSelect?.addEventListener('change', (e) => {
        AppState.filters.cookTime = e.target.value;
        saveToLocalStorage();
    });

    DOM.leftoverModeToggle?.addEventListener('change', (e) => {
        AppState.filters.leftoverMode = e.target.checked;
        saveToLocalStorage();
    });

    // Number input buttons
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', handleNumberButton);
    });

    // Recipe generator
    DOM.generateRecipeBtn?.addEventListener('click', generateRecipe);
    DOM.whatsMissingBtn?.addEventListener('click', suggestMissingIngredients);
    DOM.stepByStepToggle?.addEventListener('change', toggleStepByStep);

    // Meal plan
    DOM.generateMealPlanBtn?.addEventListener('click', generateMealPlan);
    DOM.prevMonthBtn?.addEventListener('click', () => navigateMonth(-1));
    DOM.nextMonthBtn?.addEventListener('click', () => navigateMonth(1));

    // Shopping list
    DOM.clearCheckedBtn?.addEventListener('click', clearCheckedItems);
    DOM.copyListBtn?.addEventListener('click', copyShoppingList);

    // Modal
    DOM.modalOverlay?.addEventListener('click', closeModal);
    DOM.modalClose?.addEventListener('click', closeModal);
    DOM.modalStepByStepToggle?.addEventListener('change', toggleModalStepByStep);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ==================== NAVIGATION ====================
/**
 * Switch between tabs
 * @param {string} tabName - The tab to switch to
 */
function switchTab(tabName) {
    AppState.currentTab = tabName;

    // Update nav tabs
    DOM.navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab contents
    DOM.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Close mobile menu if open
    DOM.mobileNav?.classList.remove('open');
}

/**
 * Toggle mobile menu visibility
 */
function toggleMobileMenu() {
    DOM.mobileNav?.classList.toggle('open');
}

/**
 * Toggle filters visibility (mobile)
 */
function toggleFilters() {
    DOM.filtersContent?.classList.toggle('open');
    const arrow = DOM.toggleFiltersBtn?.querySelector('.arrow');
    if (arrow) {
        arrow.textContent = DOM.filtersContent?.classList.contains('open') ? '▲' : '▼';
    }
}

// ==================== FILTER HANDLING ====================
/**
 * Update dietary restrictions from checkboxes
 */
function updateDietaryFilters() {
    AppState.filters.dietary = Array.from(DOM.dietaryCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    saveToLocalStorage();
}

/**
 * Update filter UI from application state
 */
function updateFiltersFromState() {
    // Dietary checkboxes
    DOM.dietaryCheckboxes.forEach(checkbox => {
        checkbox.checked = AppState.filters.dietary.includes(checkbox.value);
    });

    // Other filters
    if (DOM.difficultySlider) DOM.difficultySlider.value = AppState.filters.difficulty;
    if (DOM.servingsInput) DOM.servingsInput.value = AppState.filters.servings;
    if (DOM.cookTimeSelect) DOM.cookTimeSelect.value = AppState.filters.cookTime;
    if (DOM.leftoverModeToggle) DOM.leftoverModeToggle.checked = AppState.filters.leftoverMode;
}

/**
 * Handle number input button clicks (+/-)
 * @param {Event} e - Click event
 */
function handleNumberButton(e) {
    const target = e.target.dataset.target;
    const input = document.getElementById(target);
    if (!input) return;

    let value = parseInt(input.value) || 0;
    if (e.target.classList.contains('plus')) {
        value = Math.min(12, value + 1);
    } else {
        value = Math.max(1, value - 1);
    }
    input.value = value;
    input.dispatchEvent(new Event('change'));
}

/**
 * Get current filter settings as a prompt string
 * @returns {string} Filter settings for AI prompt
 */
function getFilterPrompt() {
    const filters = [];

    if (AppState.filters.dietary.length > 0) {
        filters.push(`Dietary restrictions: ${AppState.filters.dietary.join(', ')}`);
    }

    const difficulties = ['beginner', 'intermediate', 'advanced'];
    filters.push(`Difficulty level: ${difficulties[AppState.filters.difficulty - 1]}`);

    filters.push(`Servings: ${AppState.filters.servings}`);

    if (AppState.filters.cookTime !== 'any') {
        filters.push(`Maximum cook time: ${AppState.filters.cookTime} minutes`);
    }

    if (AppState.filters.leftoverMode) {
        filters.push('Leftover mode: Prioritize recipes that use up ingredients quickly');
    }

    return filters.join('\n');
}

// ==================== AI INTEGRATION ====================
/**
 * Make an API call to the AI service
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} The AI response
 */
async function callAI(prompt) {
    // Check if API key is configured
    if (API_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
        // Return mock data for demo purposes
        return getMockResponse(prompt);
    }

    try {
        const response = await fetch(API_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional chef and nutritionist. Always respond with valid JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI API Error:', error);
        throw error;
    }
}

/**
 * Generate mock responses for demo mode
 * @param {string} prompt - The original prompt
 * @returns {string} Mock JSON response
 */
function getMockResponse(prompt) {
    // Determine what type of response is needed based on prompt content
    if (prompt.includes('missing ingredients')) {
        return JSON.stringify({
            suggestions: [
                { name: 'Fresh herbs (basil, cilantro)', reason: 'Adds freshness and flavor to many dishes' },
                { name: 'Parmesan cheese', reason: 'Great for pasta, salads, and garnishing' },
                { name: 'Lemons', reason: 'Essential for brightness in cooking and dressings' }
            ]
        });
    }

    if (prompt.includes('meal plan')) {
        return generateMockMealPlan();
    }

    if (prompt.includes('cooking tips')) {
        return JSON.stringify({
            tips: [
                {
                    title: 'Prep Ingredients Ahead',
                    content: 'Spend 30 minutes on Sunday prepping vegetables for the week. Store in airtight containers for quick weeknight cooking.',
                    icon: '🔪'
                },
                {
                    title: 'Season as You Go',
                    content: 'Add salt in layers throughout cooking rather than all at the end. This builds deeper, more complex flavors.',
                    icon: '🧂'
                },
                {
                    title: 'Let Meat Rest',
                    content: 'After cooking, let meat rest for 5-10 minutes. This allows juices to redistribute for more tender, flavorful results.',
                    icon: '🥩'
                },
                {
                    title: 'Toast Your Spices',
                    content: 'Dry-toast whole spices in a pan before grinding. This releases essential oils and intensifies flavor.',
                    icon: '✨'
                },
                {
                    title: 'Taste Constantly',
                    content: 'Professional chefs taste their food throughout cooking. Adjust seasoning as you go for the best final result.',
                    icon: '👨‍🍳'
                }
            ]
        });
    }

    // Default: generate a recipe
    return generateMockRecipe(prompt);
}

/**
 * Generate a mock recipe based on ingredients
 * @param {string} prompt - The prompt containing ingredients
 * @returns {string} JSON recipe
 */
function generateMockRecipe(prompt) {
    const recipes = [
        {
            id: 'recipe_' + Date.now(),
            name: 'Garlic Herb Chicken with Roasted Vegetables',
            time: '45 min',
            servings: AppState.filters.servings,
            difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1],
            nutrition: {
                calories: 420,
                protein: '35g',
                carbs: '28g',
                fat: '18g'
            },
            ingredients: [
                { name: '2 chicken breasts', substitutes: 'Tofu, tempeh, or seitan for vegetarian' },
                { name: '4 cloves garlic, minced', substitutes: 'Garlic powder (1 tsp) or shallots' },
                { name: '2 tbsp olive oil', substitutes: 'Avocado oil, coconut oil, or butter' },
                { name: '1 lemon, juiced', substitutes: 'Lime juice or white wine vinegar' },
                { name: '1 tbsp fresh rosemary', substitutes: 'Dried rosemary (1 tsp) or thyme' },
                { name: '2 cups mixed vegetables', substitutes: 'Any seasonal vegetables' },
                { name: 'Salt and pepper to taste', substitutes: 'Seasoned salt or herb blend' }
            ],
            instructions: [
                'Preheat your oven to 400°F (200°C). Line a baking sheet with parchment paper.',
                'In a small bowl, mix together minced garlic, olive oil, lemon juice, and chopped rosemary to create the marinade.',
                'Place chicken breasts in a dish and coat thoroughly with half the marinade. Let sit for 15 minutes.',
                'Toss the mixed vegetables with the remaining marinade and spread on the prepared baking sheet.',
                'Place the marinated chicken on top of the vegetables.',
                'Roast for 25-30 minutes until chicken reaches an internal temperature of 165°F (74°C).',
                'Let rest for 5 minutes before slicing and serving over the roasted vegetables.'
            ]
        },
        {
            id: 'recipe_' + Date.now(),
            name: 'Mediterranean Quinoa Bowl',
            time: '30 min',
            servings: AppState.filters.servings,
            difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1],
            nutrition: {
                calories: 380,
                protein: '14g',
                carbs: '52g',
                fat: '14g'
            },
            ingredients: [
                { name: '1 cup quinoa', substitutes: 'Couscous, rice, or bulgur wheat' },
                { name: '1 cucumber, diced', substitutes: 'Zucchini or celery' },
                { name: '1 cup cherry tomatoes, halved', substitutes: 'Regular tomatoes, diced' },
                { name: '1/2 red onion, thinly sliced', substitutes: 'Shallots or green onions' },
                { name: '1/2 cup kalamata olives', substitutes: 'Green olives or capers' },
                { name: '1/4 cup feta cheese', substitutes: 'Goat cheese or vegan feta' },
                { name: '3 tbsp olive oil', substitutes: 'Avocado oil' },
                { name: '2 tbsp lemon juice', substitutes: 'Red wine vinegar' }
            ],
            instructions: [
                'Rinse quinoa under cold water. Combine with 2 cups water in a saucepan and bring to a boil.',
                'Reduce heat to low, cover, and simmer for 15 minutes until water is absorbed.',
                'Fluff quinoa with a fork and let cool for 10 minutes.',
                'While quinoa cools, prepare all vegetables and combine in a large bowl.',
                'Add cooled quinoa to the vegetables and toss to combine.',
                'Drizzle with olive oil and lemon juice, season with salt and pepper.',
                'Top with crumbled feta cheese and serve immediately or refrigerate for meal prep.'
            ]
        }
    ];

    return JSON.stringify(recipes[Math.floor(Math.random() * recipes.length)]);
}

/**
 * Generate a mock meal plan
 * @returns {string} JSON meal plan
 */
function generateMockMealPlan() {
    const breakfasts = [
        'Avocado Toast with Eggs', 'Greek Yogurt Parfait', 'Oatmeal with Berries',
        'Smoothie Bowl', 'Veggie Omelette', 'Overnight Oats', 'Banana Pancakes'
    ];
    const lunches = [
        'Caesar Salad', 'Turkey Wrap', 'Quinoa Bowl', 'Chicken Soup',
        'Grilled Cheese & Tomato Soup', 'Buddha Bowl', 'Mediterranean Pita'
    ];
    const dinners = [
        'Grilled Salmon', 'Pasta Primavera', 'Chicken Stir Fry', 'Beef Tacos',
        'Vegetable Curry', 'Baked Chicken', 'Shrimp Scampi'
    ];

    const mealPlan = {};
    const daysInMonth = new Date(AppState.currentYear, AppState.currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${AppState.currentYear}-${String(AppState.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        mealPlan[dateKey] = {
            breakfast: {
                name: breakfasts[Math.floor(Math.random() * breakfasts.length)],
                ...generateQuickRecipe('breakfast')
            },
            lunch: {
                name: lunches[Math.floor(Math.random() * lunches.length)],
                ...generateQuickRecipe('lunch')
            },
            dinner: {
                name: dinners[Math.floor(Math.random() * dinners.length)],
                ...generateQuickRecipe('dinner')
            }
        };
    }

    return JSON.stringify({ mealPlan });
}

/**
 * Generate quick recipe details for meal plan
 * @param {string} mealType - breakfast, lunch, or dinner
 * @returns {object} Recipe details
 */
function generateQuickRecipe(mealType) {
    const baseCalories = { breakfast: 350, lunch: 500, dinner: 600 };
    const times = ['15 min', '20 min', '30 min', '45 min'];

    return {
        id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        time: times[Math.floor(Math.random() * times.length)],
        servings: AppState.filters.servings,
        difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1],
        nutrition: {
            calories: baseCalories[mealType] + Math.floor(Math.random() * 100),
            protein: Math.floor(15 + Math.random() * 25) + 'g',
            carbs: Math.floor(20 + Math.random() * 40) + 'g',
            fat: Math.floor(10 + Math.random() * 20) + 'g'
        },
        ingredients: [
            { name: 'Main protein source', substitutes: 'Alternative protein' },
            { name: 'Fresh vegetables', substitutes: 'Frozen vegetables' },
            { name: 'Whole grains', substitutes: 'Alternative grains' },
            { name: 'Healthy fats', substitutes: 'Alternative fats' },
            { name: 'Seasonings', substitutes: 'Alternative seasonings' }
        ],
        instructions: [
            'Prepare all ingredients and gather necessary equipment.',
            'Cook the main protein according to preferred method.',
            'Prepare the vegetables and grains.',
            'Combine all elements and season to taste.',
            'Plate and serve immediately.'
        ]
    };
}

// ==================== RECIPE GENERATION ====================
/**
 * Generate a recipe from entered ingredients
 */
async function generateRecipe() {
    const ingredients = DOM.ingredientsInput?.value.trim();

    if (!ingredients) {
        showToast('Please enter some ingredients first', 'error');
        return;
    }

    showLoading('Generating your recipe...');

    try {
        const prompt = `Create a recipe using these ingredients: ${ingredients}

${getFilterPrompt()}

Respond with a JSON object containing:
{
  "id": "unique_id",
  "name": "Recipe Name",
  "time": "cook time",
  "servings": number,
  "difficulty": "Beginner/Intermediate/Advanced",
  "nutrition": {
    "calories": number,
    "protein": "Xg",
    "carbs": "Xg",
    "fat": "Xg"
  },
  "ingredients": [
    {"name": "ingredient with amount", "substitutes": "possible substitutes"}
  ],
  "instructions": ["step 1", "step 2", ...]
}`;

        const response = await callAI(prompt);
        const recipe = JSON.parse(response);

        AppState.currentRecipe = recipe;
        displayRecipe(recipe);
        DOM.recipeResult?.classList.remove('hidden');

        hideLoading();
        showToast('Recipe generated successfully!', 'success');
    } catch (error) {
        hideLoading();
        showToast('Failed to generate recipe. Please try again.', 'error');
        console.error('Recipe generation error:', error);
    }
}

/**
 * Display a recipe in the recipe result section
 * @param {object} recipe - The recipe to display
 */
function displayRecipe(recipe) {
    // Update title
    document.getElementById('recipe-title').textContent = recipe.name;

    // Update meta
    document.getElementById('recipe-time').textContent = recipe.time;
    document.getElementById('recipe-servings').textContent = `${recipe.servings} servings`;
    document.getElementById('recipe-difficulty').textContent = recipe.difficulty;

    // Update nutrition
    document.getElementById('calories').textContent = recipe.nutrition.calories;
    document.getElementById('protein').textContent = recipe.nutrition.protein;
    document.getElementById('carbs').textContent = recipe.nutrition.carbs;
    document.getElementById('fat').textContent = recipe.nutrition.fat;

    // Update ingredients
    const ingredientsList = document.getElementById('recipe-ingredients');
    ingredientsList.innerHTML = recipe.ingredients.map(ing => `
        <li class="ingredient-item" data-substitutes="Substitutes: ${ing.substitutes}">
            ${ing.name}
        </li>
    `).join('');

    // Update instructions
    const instructionsList = document.getElementById('recipe-instructions');
    instructionsList.innerHTML = recipe.instructions.map((step, index) => `
        <div class="instruction-step" data-step="${index + 1}">
            <span class="step-number">${index + 1}</span>
            <div class="step-content">${step}</div>
        </div>
    `).join('');

    // Update favorite button
    const favoriteBtn = DOM.recipeResult?.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.dataset.recipeId = recipe.id;
        const isFavorite = AppState.favorites.some(f => f.id === recipe.id);
        favoriteBtn.classList.toggle('active', isFavorite);
        favoriteBtn.querySelector('.heart-icon').textContent = isFavorite ? '♥' : '♡';
        favoriteBtn.onclick = () => toggleFavorite(recipe);
    }

    // Reset step-by-step mode
    if (DOM.stepByStepToggle) DOM.stepByStepToggle.checked = false;
    instructionsList.classList.remove('step-by-step');
}

/**
 * Suggest missing ingredients that would unlock more recipes
 */
async function suggestMissingIngredients() {
    const ingredients = DOM.ingredientsInput?.value.trim();

    showLoading('Analyzing your pantry...');

    try {
        const prompt = `Given these ingredients: ${ingredients || 'basic pantry items'}

${getFilterPrompt()}

Suggest 3 ingredients that would significantly expand recipe options.
Respond with JSON:
{
  "suggestions": [
    {"name": "ingredient", "reason": "why this helps"}
  ]
}`;

        const response = await callAI(prompt);
        const data = JSON.parse(response);

        DOM.missingList.innerHTML = data.suggestions.map(item => `
            <div class="missing-item">
                <span>✨ ${item.name}</span>
                <span class="reason">${item.reason}</span>
            </div>
        `).join('');

        DOM.missingIngredients?.classList.remove('hidden');
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to get suggestions. Please try again.', 'error');
    }
}

/**
 * Toggle step-by-step mode for recipe instructions
 */
function toggleStepByStep() {
    const instructionsList = document.getElementById('recipe-instructions');
    const isEnabled = DOM.stepByStepToggle?.checked;

    instructionsList?.classList.toggle('step-by-step', isEnabled);

    if (isEnabled) {
        const steps = instructionsList.querySelectorAll('.instruction-step');
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === 0);
            step.onclick = () => activateStep(step, steps);
        });
    } else {
        const steps = instructionsList.querySelectorAll('.instruction-step');
        steps.forEach(step => {
            step.classList.remove('active', 'completed');
            step.onclick = null;
        });
    }
}

/**
 * Activate a step in step-by-step mode
 * @param {HTMLElement} currentStep - The step to activate
 * @param {NodeList} allSteps - All instruction steps
 */
function activateStep(currentStep, allSteps) {
    const currentIndex = parseInt(currentStep.dataset.step) - 1;

    allSteps.forEach((step, index) => {
        step.classList.remove('active');
        if (index < currentIndex) {
            step.classList.add('completed');
        } else if (index === currentIndex) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('completed');
        }
    });
}

// ==================== MEAL PLAN GENERATION ====================
/**
 * Generate a monthly meal plan
 */
async function generateMealPlan() {
    showLoading('Creating your monthly meal plan...');

    try {
        const prompt = `Generate a complete monthly meal plan for ${new Date(AppState.currentYear, AppState.currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}.

${getFilterPrompt()}

Include breakfast, lunch, and dinner for each day with variety and nutritional balance.`;

        const response = await callAI(prompt);
        const data = JSON.parse(response);

        AppState.mealPlan = { ...AppState.mealPlan, ...data.mealPlan };
        saveToLocalStorage();

        renderCalendar();
        generateShoppingList();
        await generateCookingTips();

        hideLoading();
        showToast('Meal plan generated successfully!', 'success');
    } catch (error) {
        hideLoading();
        showToast('Failed to generate meal plan. Please try again.', 'error');
        console.error('Meal plan generation error:', error);
    }
}

/**
 * Generate cooking tips based on meal plan
 */
async function generateCookingTips() {
    try {
        const prompt = `Based on a meal plan that includes various home-cooked meals, provide 5 helpful cooking tips.

${getFilterPrompt()}

Respond with JSON:
{
  "tips": [
    {"title": "tip title", "content": "detailed tip", "icon": "emoji"}
  ]
}`;

        const response = await callAI(prompt);
        const data = JSON.parse(response);

        DOM.tipsList.innerHTML = data.tips.map(tip => `
            <div class="tip-item">
                <span class="tip-icon">${tip.icon}</span>
                <div class="tip-content">
                    <h4>${tip.title}</h4>
                    <p>${tip.content}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to generate cooking tips:', error);
    }
}

// ==================== CALENDAR ====================
/**
 * Render the calendar grid
 */
function renderCalendar() {
    const year = AppState.currentYear;
    const month = AppState.currentMonth;

    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    DOM.currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;

    // Calculate calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let calendarHTML = '';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const meals = AppState.mealPlan[dateKey];

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateKey}">
                <span class="day-number">${day}</span>
                <div class="day-meals">
                    ${meals ? `
                        <div class="meal-item breakfast" onclick="openMealModal('${dateKey}', 'breakfast')">${meals.breakfast?.name || ''}</div>
                        <div class="meal-item lunch" onclick="openMealModal('${dateKey}', 'lunch')">${meals.lunch?.name || ''}</div>
                        <div class="meal-item dinner" onclick="openMealModal('${dateKey}', 'dinner')">${meals.dinner?.name || ''}</div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    DOM.calendarGrid.innerHTML = calendarHTML;
}

/**
 * Navigate to a different month
 * @param {number} direction - -1 for previous, 1 for next
 */
function navigateMonth(direction) {
    AppState.currentMonth += direction;

    if (AppState.currentMonth < 0) {
        AppState.currentMonth = 11;
        AppState.currentYear--;
    } else if (AppState.currentMonth > 11) {
        AppState.currentMonth = 0;
        AppState.currentYear++;
    }

    renderCalendar();
}

/**
 * Open modal with meal recipe details
 * @param {string} dateKey - The date key (YYYY-MM-DD)
 * @param {string} mealType - breakfast, lunch, or dinner
 */
function openMealModal(dateKey, mealType) {
    const meal = AppState.mealPlan[dateKey]?.[mealType];
    if (!meal) return;

    displayRecipeInModal(meal);
    DOM.modal?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Make function globally accessible
window.openMealModal = openMealModal;

/**
 * Display recipe in modal
 * @param {object} recipe - Recipe to display
 */
function displayRecipeInModal(recipe) {
    document.getElementById('modal-recipe-title').textContent = recipe.name;
    document.getElementById('modal-recipe-time').textContent = recipe.time;
    document.getElementById('modal-recipe-servings').textContent = `${recipe.servings} servings`;
    document.getElementById('modal-recipe-difficulty').textContent = recipe.difficulty;

    document.getElementById('modal-calories').textContent = recipe.nutrition.calories;
    document.getElementById('modal-protein').textContent = recipe.nutrition.protein;
    document.getElementById('modal-carbs').textContent = recipe.nutrition.carbs;
    document.getElementById('modal-fat').textContent = recipe.nutrition.fat;

    const ingredientsList = document.getElementById('modal-ingredients');
    ingredientsList.innerHTML = recipe.ingredients.map(ing => `
        <li class="ingredient-item" data-substitutes="Substitutes: ${ing.substitutes}">
            ${ing.name}
        </li>
    `).join('');

    const instructionsList = document.getElementById('modal-instructions');
    instructionsList.innerHTML = recipe.instructions.map((step, index) => `
        <div class="instruction-step" data-step="${index + 1}">
            <span class="step-number">${index + 1}</span>
            <div class="step-content">${step}</div>
        </div>
    `).join('');

    const favoriteBtn = DOM.modal?.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.dataset.recipeId = recipe.id;
        const isFavorite = AppState.favorites.some(f => f.id === recipe.id);
        favoriteBtn.classList.toggle('active', isFavorite);
        favoriteBtn.querySelector('.heart-icon').textContent = isFavorite ? '♥' : '♡';
        favoriteBtn.onclick = () => toggleFavorite(recipe);
    }

    if (DOM.modalStepByStepToggle) DOM.modalStepByStepToggle.checked = false;
    instructionsList.classList.remove('step-by-step');

    AppState.currentRecipe = recipe;
}

/**
 * Toggle step-by-step mode in modal
 */
function toggleModalStepByStep() {
    const instructionsList = document.getElementById('modal-instructions');
    const isEnabled = DOM.modalStepByStepToggle?.checked;

    instructionsList?.classList.toggle('step-by-step', isEnabled);

    if (isEnabled) {
        const steps = instructionsList.querySelectorAll('.instruction-step');
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === 0);
            step.onclick = () => activateStep(step, steps);
        });
    }
}

/**
 * Close the recipe modal
 */
function closeModal() {
    DOM.modal?.classList.remove('open');
    document.body.style.overflow = '';
}

// ==================== SHOPPING LIST ====================
/**
 * Generate shopping list from meal plan
 */
function generateShoppingList() {
    const categories = {
        produce: { icon: '🥬', name: 'Produce', items: new Set() },
        protein: { icon: '🥩', name: 'Protein', items: new Set() },
        dairy: { icon: '🧀', name: 'Dairy', items: new Set() },
        grains: { icon: '🌾', name: 'Grains & Bread', items: new Set() },
        pantry: { icon: '🥫', name: 'Pantry', items: new Set() },
        spices: { icon: '🧂', name: 'Spices & Seasonings', items: new Set() },
        other: { icon: '🛒', name: 'Other', items: new Set() }
    };

    // Categorization keywords
    const categoryKeywords = {
        produce: ['vegetable', 'fruit', 'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'broccoli', 'spinach', 'cucumber', 'lemon', 'lime', 'apple', 'banana', 'berry', 'avocado', 'potato', 'mushroom', 'zucchini', 'celery', 'herbs', 'basil', 'cilantro', 'parsley', 'mint'],
        protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'tofu', 'tempeh', 'egg', 'meat', 'steak', 'sausage'],
        dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'feta', 'parmesan', 'mozzarella', 'cheddar'],
        grains: ['bread', 'rice', 'pasta', 'quinoa', 'oat', 'flour', 'tortilla', 'noodle', 'cereal', 'couscous'],
        spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'thyme', 'rosemary', 'cinnamon', 'turmeric', 'ginger', 'seasoning', 'spice'],
        pantry: ['oil', 'vinegar', 'sauce', 'broth', 'stock', 'can', 'bean', 'lentil', 'honey', 'sugar', 'syrup', 'nut', 'seed']
    };

    // Extract ingredients from meal plan
    Object.values(AppState.mealPlan).forEach(day => {
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const meal = day[mealType];
            if (meal?.ingredients) {
                meal.ingredients.forEach(ing => {
                    const ingredient = ing.name.toLowerCase();
                    let categorized = false;

                    for (const [category, keywords] of Object.entries(categoryKeywords)) {
                        if (keywords.some(keyword => ingredient.includes(keyword))) {
                            categories[category].items.add(ing.name);
                            categorized = true;
                            break;
                        }
                    }

                    if (!categorized) {
                        categories.other.items.add(ing.name);
                    }
                });
            }
        });
    });

    AppState.shoppingList = categories;
    saveToLocalStorage();
    renderShoppingList();
}

/**
 * Render the shopping list UI
 */
function renderShoppingList() {
    const container = DOM.shoppingListContainer;

    // Check if there are any items
    const hasItems = Object.values(AppState.shoppingList).some(cat => cat.items?.size > 0);

    if (!hasItems) {
        container.innerHTML = '<p class="empty-state">Generate a meal plan to create your shopping list!</p>';
        return;
    }

    container.innerHTML = Object.entries(AppState.shoppingList)
        .filter(([_, category]) => category.items?.size > 0)
        .map(([key, category]) => `
            <div class="shopping-category" data-category="${key}">
                <h3><span class="category-icon">${category.icon}</span> ${category.name}</h3>
                <div class="shopping-items">
                    ${Array.from(category.items).map((item, index) => `
                        <div class="shopping-item" data-item="${item}">
                            <input type="checkbox" id="${key}-${index}" onchange="toggleShoppingItem(this)">
                            <label for="${key}-${index}">${item}</label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
}

/**
 * Toggle shopping item checked state
 * @param {HTMLInputElement} checkbox - The checkbox element
 */
function toggleShoppingItem(checkbox) {
    const item = checkbox.closest('.shopping-item');
    item?.classList.toggle('checked', checkbox.checked);
    saveToLocalStorage();
}

// Make function globally accessible
window.toggleShoppingItem = toggleShoppingItem;

/**
 * Clear all checked shopping items
 */
function clearCheckedItems() {
    document.querySelectorAll('.shopping-item.checked').forEach(item => {
        const category = item.closest('.shopping-category')?.dataset.category;
        const itemName = item.dataset.item;

        if (category && itemName && AppState.shoppingList[category]) {
            AppState.shoppingList[category].items.delete(itemName);
        }
    });

    saveToLocalStorage();
    renderShoppingList();
    showToast('Checked items cleared!', 'success');
}

/**
 * Copy shopping list to clipboard
 */
async function copyShoppingList() {
    const listText = Object.entries(AppState.shoppingList)
        .filter(([_, category]) => category.items?.size > 0)
        .map(([_, category]) => {
            return `${category.name}:\n${Array.from(category.items).map(item => `  - ${item}`).join('\n')}`;
        }).join('\n\n');

    try {
        await navigator.clipboard.writeText(listText);
        showToast('Shopping list copied to clipboard!', 'success');
    } catch (error) {
        showToast('Failed to copy to clipboard', 'error');
    }
}

// ==================== FAVORITES ====================
/**
 * Toggle a recipe in favorites
 * @param {object} recipe - The recipe to toggle
 */
function toggleFavorite(recipe) {
    const index = AppState.favorites.findIndex(f => f.id === recipe.id);

    if (index === -1) {
        AppState.favorites.push(recipe);
        showToast('Added to favorites!', 'success');
    } else {
        AppState.favorites.splice(index, 1);
        showToast('Removed from favorites', 'success');
    }

    saveToLocalStorage();
    updateFavoriteButtons(recipe.id);
    renderFavorites();
}

/**
 * Update all favorite buttons for a specific recipe
 * @param {string} recipeId - The recipe ID
 */
function updateFavoriteButtons(recipeId) {
    const isFavorite = AppState.favorites.some(f => f.id === recipeId);

    document.querySelectorAll(`.favorite-btn[data-recipe-id="${recipeId}"]`).forEach(btn => {
        btn.classList.toggle('active', isFavorite);
        btn.querySelector('.heart-icon').textContent = isFavorite ? '♥' : '♡';
    });
}

/**
 * Render the favorites section
 */
function renderFavorites() {
    const container = DOM.favoritesContainer;

    if (AppState.favorites.length === 0) {
        container.innerHTML = '<p class="empty-state">No favorites yet! Click the heart icon on any recipe to save it here.</p>';
        return;
    }

    container.innerHTML = AppState.favorites.map(recipe => `
        <div class="favorite-card" onclick="openFavoriteModal('${recipe.id}')">
            <div class="favorite-card-header">
                <h3>${recipe.name}</h3>
                <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${recipe.id}')" aria-label="Remove from favorites">×</button>
            </div>
            <div class="recipe-meta">
                <span class="meta-item"><span class="meta-icon">⏱️</span> ${recipe.time}</span>
                <span class="meta-item"><span class="meta-icon">👥</span> ${recipe.servings} servings</span>
            </div>
        </div>
    `).join('');
}

/**
 * Open a favorite recipe in modal
 * @param {string} recipeId - The recipe ID to open
 */
function openFavoriteModal(recipeId) {
    const recipe = AppState.favorites.find(f => f.id === recipeId);
    if (!recipe) return;

    displayRecipeInModal(recipe);
    DOM.modal?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

// Make function globally accessible
window.openFavoriteModal = openFavoriteModal;

/**
 * Remove a recipe from favorites
 * @param {string} recipeId - The recipe ID to remove
 */
function removeFavorite(recipeId) {
    const index = AppState.favorites.findIndex(f => f.id === recipeId);
    if (index !== -1) {
        AppState.favorites.splice(index, 1);
        saveToLocalStorage();
        updateFavoriteButtons(recipeId);
        renderFavorites();
        showToast('Removed from favorites', 'success');
    }
}

// Make function globally accessible
window.removeFavorite = removeFavorite;

// ==================== LOCAL STORAGE ====================
/**
 * Save application state to local storage
 */
function saveToLocalStorage() {
    const dataToSave = {
        mealPlan: AppState.mealPlan,
        shoppingList: Object.fromEntries(
            Object.entries(AppState.shoppingList).map(([key, val]) => [
                key,
                { ...val, items: Array.from(val.items || []) }
            ])
        ),
        favorites: AppState.favorites,
        filters: AppState.filters
    };

    localStorage.setItem('recipeAI_data', JSON.stringify(dataToSave));
}

/**
 * Load application state from local storage
 */
function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('recipeAI_data');
        if (!saved) return;

        const data = JSON.parse(saved);

        if (data.mealPlan) {
            AppState.mealPlan = data.mealPlan;
        }

        if (data.shoppingList) {
            AppState.shoppingList = Object.fromEntries(
                Object.entries(data.shoppingList).map(([key, val]) => [
                    key,
                    { ...val, items: new Set(val.items || []) }
                ])
            );
        }

        if (data.favorites) {
            AppState.favorites = data.favorites;
        }

        if (data.filters) {
            AppState.filters = { ...AppState.filters, ...data.filters };
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// ==================== UI UTILITIES ====================
/**
 * Show loading overlay
 * @param {string} message - Loading message to display
 */
function showLoading(message = 'Loading...') {
    DOM.loadingText.textContent = message;
    DOM.loadingOverlay?.classList.remove('hidden');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    DOM.loadingOverlay?.classList.add('hidden');
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error)
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;

    DOM.toastContainer?.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to generate recipe
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (AppState.currentTab === 'generator') {
            generateRecipe();
        } else if (AppState.currentTab === 'meal-plan') {
            generateMealPlan();
        }
    }

    // Number keys 1-4 to switch tabs
    if (e.key >= '1' && e.key <= '4' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tabs = ['generator', 'meal-plan', 'shopping', 'favorites'];
        const index = parseInt(e.key) - 1;
        if (tabs[index] && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
            switchTab(tabs[index]);
        }
    }
});

console.log('RecipeAI Application Initialized');
console.log('To enable AI features, add your API key in app.js');
