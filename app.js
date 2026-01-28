/**
 * ==================== RECIPE AI - MAIN APPLICATION ====================
 * A comprehensive meal planning and recipe generation application
 * with AI integration, local storage persistence, and responsive design.
 */

// ==================== API CONFIGURATION ====================
// API key is stored in sessionStorage for security (never committed to code)
const API_CONFIG = {
    get apiKey() {
        return sessionStorage.getItem('openai_api_key') || '';
    },
    set apiKey(value) {
        sessionStorage.setItem('openai_api_key', value);
    },
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo', // or 'gpt-4' for better results
};

/**
 * Prompt user for API key if not set
 * @returns {boolean} True if API key is available
 */
function ensureApiKey() {
    if (API_CONFIG.apiKey) return true;

    const key = prompt('Enter your OpenAI API key to enable AI features:\n(This is stored only in your browser session and never sent anywhere except OpenAI)');
    if (key && key.startsWith('sk-')) {
        API_CONFIG.apiKey = key;
        showToast('API key saved for this session!', 'success');
        return true;
    }
    return false;
}

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
    },
    mealTypes: {
        breakfast: true,
        lunch: true,
        dinner: true
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
    clearMealPlanBtn: document.getElementById('clear-meal-plan-btn'),
    mealTypeCheckboxes: document.querySelectorAll('input[name="meal-type"]'),
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

    // Settings Modal
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyBtn: document.getElementById('save-api-key'),
    clearApiKeyBtn: document.getElementById('clear-api-key'),
    apiStatus: document.getElementById('api-status'),

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
    updateMealTypesFromState();
    updateApiStatus();
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
    DOM.clearMealPlanBtn?.addEventListener('click', clearMealPlan);
    DOM.prevMonthBtn?.addEventListener('click', () => navigateMonth(-1));
    DOM.nextMonthBtn?.addEventListener('click', () => navigateMonth(1));

    // Meal type checkboxes
    DOM.mealTypeCheckboxes?.forEach(checkbox => {
        checkbox.addEventListener('change', updateMealTypes);
    });

    // Shopping list
    DOM.clearCheckedBtn?.addEventListener('click', clearCheckedItems);
    DOM.copyListBtn?.addEventListener('click', copyShoppingList);

    // Modal
    DOM.modalOverlay?.addEventListener('click', closeModal);
    DOM.modalClose?.addEventListener('click', closeModal);
    DOM.modalStepByStepToggle?.addEventListener('change', toggleModalStepByStep);

    // Settings Modal
    DOM.settingsBtn?.addEventListener('click', openSettingsModal);
    DOM.settingsModal?.querySelector('.modal-overlay')?.addEventListener('click', closeSettingsModal);
    DOM.settingsModal?.querySelector('.modal-close')?.addEventListener('click', closeSettingsModal);
    DOM.saveApiKeyBtn?.addEventListener('click', saveApiKey);
    DOM.clearApiKeyBtn?.addEventListener('click', clearApiKey);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeSettingsModal();
        }
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
 * Update meal types from checkboxes
 */
function updateMealTypes() {
    DOM.mealTypeCheckboxes?.forEach(checkbox => {
        AppState.mealTypes[checkbox.value] = checkbox.checked;
    });

    // Ensure at least one meal type is selected
    const hasSelection = Object.values(AppState.mealTypes).some(v => v);
    if (!hasSelection) {
        AppState.mealTypes.dinner = true;
        const dinnerCheckbox = document.querySelector('input[name="meal-type"][value="dinner"]');
        if (dinnerCheckbox) dinnerCheckbox.checked = true;
        showToast('At least one meal type must be selected', 'error');
    }

    saveToLocalStorage();
}

/**
 * Update meal type checkboxes from state
 */
function updateMealTypesFromState() {
    DOM.mealTypeCheckboxes?.forEach(checkbox => {
        checkbox.checked = AppState.mealTypes[checkbox.value] ?? true;
    });
}

/**
 * Clear the current meal plan
 */
function clearMealPlan() {
    if (!confirm('Are you sure you want to clear the current meal plan? This cannot be undone.')) {
        return;
    }

    AppState.mealPlan = {};
    AppState.shoppingList = {};
    saveToLocalStorage();
    renderCalendar();
    renderShoppingList();

    // Reset tips
    DOM.tipsList.innerHTML = '<p class="empty-state">Generate a meal plan to see personalized cooking tips!</p>';

    showToast('Meal plan cleared!', 'success');
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
    if (!API_CONFIG.apiKey) {
        // Return mock data for demo purposes
        console.log('Using demo mode (no API key)');
        return getMockResponse(prompt);
    }

    try {
        console.log('Calling OpenAI API...');
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
                        content: `You are a professional chef and nutritionist. Always respond with valid JSON only - no markdown, no code blocks, no explanations. Just pure JSON that can be parsed directly.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);

            if (response.status === 401) {
                showToast('Invalid API key. Please check your settings.', 'error');
                throw new Error('Invalid API key');
            } else if (response.status === 429) {
                showToast('Rate limit exceeded. Please wait a moment.', 'error');
                throw new Error('Rate limit exceeded');
            } else if (response.status === 500) {
                showToast('OpenAI server error. Using demo mode.', 'error');
                return getMockResponse(prompt);
            }

            throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Clean up response - remove markdown code blocks if present
        content = content.trim();
        if (content.startsWith('```json')) {
            content = content.slice(7);
        } else if (content.startsWith('```')) {
            content = content.slice(3);
        }
        if (content.endsWith('```')) {
            content = content.slice(0, -3);
        }
        content = content.trim();

        console.log('AI Response received successfully');
        return content;
    } catch (error) {
        console.error('AI API Error:', error);

        // Fall back to mock data on error
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showToast('Network error. Using demo mode.', 'error');
            return getMockResponse(prompt);
        }

        throw error;
    }
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {object} Parsed object or null
 */
function safeJSONParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('JSON Parse Error:', error);
        console.log('Failed to parse:', jsonString.substring(0, 200));
        return null;
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
    // Extract ingredients from prompt to make more relevant recipes
    const promptLower = prompt.toLowerCase();

    const recipeDatabase = [
        {
            keywords: ['chicken', 'garlic', 'lemon'],
            recipe: {
                name: 'Lemon Garlic Roasted Chicken',
                time: '45 min',
                nutrition: { calories: 420, protein: '38g', carbs: '12g', fat: '24g' },
                ingredients: [
                    { name: '4 chicken thighs (bone-in)', substitutes: 'Chicken breasts or tofu steaks' },
                    { name: '6 cloves garlic, minced', substitutes: 'Garlic powder (2 tsp)' },
                    { name: '2 lemons, juiced and zested', substitutes: 'Lime juice or orange juice' },
                    { name: '3 tbsp olive oil', substitutes: 'Avocado oil or butter' },
                    { name: '1 tbsp fresh thyme', substitutes: 'Dried thyme (1 tsp)' },
                    { name: 'Salt and pepper to taste', substitutes: 'Seasoned salt' }
                ],
                instructions: [
                    'Preheat oven to 425°F (220°C).',
                    'Pat chicken thighs dry with paper towels and season generously with salt and pepper.',
                    'Whisk together olive oil, lemon juice, zest, garlic, and thyme in a small bowl.',
                    'Place chicken in a baking dish and pour the lemon garlic mixture over it.',
                    'Roast for 35-40 minutes until skin is golden and internal temp reaches 165°F.',
                    'Let rest 5 minutes before serving. Spoon pan juices over chicken.'
                ]
            }
        },
        {
            keywords: ['pasta', 'tomato', 'basil'],
            recipe: {
                name: 'Fresh Tomato Basil Pasta',
                time: '25 min',
                nutrition: { calories: 380, protein: '12g', carbs: '58g', fat: '14g' },
                ingredients: [
                    { name: '1 lb spaghetti or penne', substitutes: 'Gluten-free pasta or zucchini noodles' },
                    { name: '4 ripe tomatoes, diced', substitutes: 'Cherry tomatoes or canned San Marzano' },
                    { name: '1 cup fresh basil leaves', substitutes: 'Dried basil (2 tbsp)' },
                    { name: '4 cloves garlic, sliced', substitutes: 'Garlic powder' },
                    { name: '1/4 cup olive oil', substitutes: 'Butter' },
                    { name: '1/2 cup parmesan cheese', substitutes: 'Nutritional yeast for vegan' }
                ],
                instructions: [
                    'Cook pasta according to package directions. Reserve 1 cup pasta water.',
                    'While pasta cooks, heat olive oil in a large pan over medium heat.',
                    'Add garlic and cook until fragrant, about 1 minute.',
                    'Add diced tomatoes and cook 5-7 minutes until they break down.',
                    'Drain pasta and add to the pan with tomatoes. Toss to combine.',
                    'Add pasta water as needed for desired consistency.',
                    'Remove from heat, add fresh basil and parmesan. Serve immediately.'
                ]
            }
        },
        {
            keywords: ['beef', 'stir', 'vegetables'],
            recipe: {
                name: 'Beef and Vegetable Stir Fry',
                time: '20 min',
                nutrition: { calories: 450, protein: '32g', carbs: '28g', fat: '24g' },
                ingredients: [
                    { name: '1 lb flank steak, sliced thin', substitutes: 'Chicken, shrimp, or tofu' },
                    { name: '2 cups mixed stir fry vegetables', substitutes: 'Any vegetables you have' },
                    { name: '3 tbsp soy sauce', substitutes: 'Coconut aminos for gluten-free' },
                    { name: '1 tbsp sesame oil', substitutes: 'Vegetable oil' },
                    { name: '2 cloves garlic, minced', substitutes: 'Garlic powder' },
                    { name: '1 inch ginger, grated', substitutes: 'Ground ginger (1/2 tsp)' },
                    { name: '2 tbsp vegetable oil', substitutes: 'Any neutral oil' }
                ],
                instructions: [
                    'Slice beef against the grain into thin strips.',
                    'Heat vegetable oil in a wok or large skillet over high heat.',
                    'Add beef in a single layer and cook 2 minutes without stirring. Flip and cook 1 more minute.',
                    'Remove beef and set aside. Add more oil if needed.',
                    'Add vegetables and stir fry 3-4 minutes until crisp-tender.',
                    'Add garlic and ginger, cook 30 seconds.',
                    'Return beef to pan, add soy sauce and sesame oil. Toss to combine.',
                    'Serve over rice or noodles.'
                ]
            }
        },
        {
            keywords: ['salmon', 'fish'],
            recipe: {
                name: 'Honey Glazed Baked Salmon',
                time: '25 min',
                nutrition: { calories: 380, protein: '34g', carbs: '18g', fat: '20g' },
                ingredients: [
                    { name: '4 salmon fillets (6 oz each)', substitutes: 'Trout, arctic char, or cod' },
                    { name: '3 tbsp honey', substitutes: 'Maple syrup or brown sugar' },
                    { name: '2 tbsp soy sauce', substitutes: 'Tamari or coconut aminos' },
                    { name: '1 tbsp Dijon mustard', substitutes: 'Whole grain mustard' },
                    { name: '2 cloves garlic, minced', substitutes: 'Garlic powder' },
                    { name: '1 lemon, sliced', substitutes: 'Orange slices' }
                ],
                instructions: [
                    'Preheat oven to 400°F (200°C). Line baking sheet with foil.',
                    'Whisk together honey, soy sauce, mustard, and garlic.',
                    'Place salmon fillets on baking sheet, skin-side down.',
                    'Brush generously with honey glaze.',
                    'Top with lemon slices.',
                    'Bake 12-15 minutes until salmon flakes easily.',
                    'Broil 1-2 minutes for caramelized top if desired.'
                ]
            }
        },
        {
            keywords: ['egg', 'vegetable', 'breakfast'],
            recipe: {
                name: 'Loaded Veggie Frittata',
                time: '30 min',
                nutrition: { calories: 320, protein: '22g', carbs: '12g', fat: '22g' },
                ingredients: [
                    { name: '8 large eggs', substitutes: 'Egg whites or JUST Egg for vegan' },
                    { name: '1 cup spinach, chopped', substitutes: 'Kale or arugula' },
                    { name: '1/2 cup bell peppers, diced', substitutes: 'Zucchini or mushrooms' },
                    { name: '1/4 cup onion, diced', substitutes: 'Shallots or leeks' },
                    { name: '1/2 cup cheese, shredded', substitutes: 'Dairy-free cheese' },
                    { name: '2 tbsp olive oil', substitutes: 'Butter' },
                    { name: 'Salt, pepper, herbs to taste', substitutes: 'Italian seasoning' }
                ],
                instructions: [
                    'Preheat oven to 375°F (190°C).',
                    'Whisk eggs with salt, pepper, and herbs in a bowl.',
                    'Heat olive oil in an oven-safe skillet over medium heat.',
                    'Sauté onions and peppers until softened, about 4 minutes.',
                    'Add spinach and cook until wilted.',
                    'Pour eggs over vegetables. Cook without stirring 2 minutes.',
                    'Sprinkle cheese on top and transfer to oven.',
                    'Bake 12-15 minutes until set and golden.',
                    'Let cool 5 minutes before slicing.'
                ]
            }
        }
    ];

    // Default recipe if no keywords match
    const defaultRecipe = {
        name: 'Simple Pan-Seared Protein with Vegetables',
        time: '30 min',
        nutrition: { calories: 350, protein: '28g', carbs: '22g', fat: '18g' },
        ingredients: [
            { name: '1 lb protein of choice', substitutes: 'Chicken, fish, tofu, or tempeh' },
            { name: '2 cups mixed vegetables', substitutes: 'Any seasonal vegetables' },
            { name: '2 tbsp olive oil', substitutes: 'Any cooking oil' },
            { name: '2 cloves garlic', substitutes: 'Garlic powder or shallots' },
            { name: 'Fresh herbs', substitutes: 'Dried herbs' },
            { name: 'Salt and pepper', substitutes: 'Your favorite seasoning blend' }
        ],
        instructions: [
            'Pat protein dry and season generously with salt and pepper.',
            'Heat olive oil in a large skillet over medium-high heat.',
            'Cook protein 4-5 minutes per side until golden and cooked through.',
            'Remove and rest while cooking vegetables.',
            'In the same pan, sauté vegetables with garlic 5-7 minutes.',
            'Season vegetables and serve alongside the protein.',
            'Garnish with fresh herbs.'
        ]
    };

    // Find matching recipe based on ingredients
    let selectedRecipe = defaultRecipe;
    for (const item of recipeDatabase) {
        if (item.keywords.some(kw => promptLower.includes(kw))) {
            selectedRecipe = item.recipe;
            break;
        }
    }

    return JSON.stringify({
        id: 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: selectedRecipe.name,
        time: selectedRecipe.time,
        servings: AppState.filters.servings,
        difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1],
        nutrition: selectedRecipe.nutrition,
        ingredients: selectedRecipe.ingredients,
        instructions: selectedRecipe.instructions
    });
}

/**
 * Generate a mock meal plan
 * @returns {string} JSON meal plan
 */
function generateMockMealPlan() {
    // Comprehensive meal database with full recipe details
    const mealDatabase = {
        breakfast: [
            {
                name: 'Avocado Toast with Poached Eggs',
                time: '15 min',
                nutrition: { calories: 380, protein: '14g', carbs: '32g', fat: '24g' },
                ingredients: [
                    { name: '2 slices whole grain bread', substitutes: 'Gluten-free bread or English muffin' },
                    { name: '1 ripe avocado', substitutes: 'Hummus or cream cheese' },
                    { name: '2 eggs', substitutes: 'Scrambled tofu' },
                    { name: 'Red pepper flakes', substitutes: 'Everything bagel seasoning' },
                    { name: 'Salt and pepper', substitutes: 'Herb blend' }
                ],
                instructions: [
                    'Toast bread until golden brown.',
                    'Bring a pot of water to a gentle simmer for poaching.',
                    'Mash avocado with salt, pepper, and red pepper flakes.',
                    'Create a gentle whirlpool and carefully drop eggs in. Cook 3 minutes.',
                    'Spread avocado on toast and top with poached eggs.',
                    'Season and serve immediately.'
                ]
            },
            {
                name: 'Greek Yogurt Parfait',
                time: '10 min',
                nutrition: { calories: 320, protein: '18g', carbs: '42g', fat: '12g' },
                ingredients: [
                    { name: '1.5 cups Greek yogurt', substitutes: 'Coconut yogurt for dairy-free' },
                    { name: '1/2 cup granola', substitutes: 'Muesli or crushed nuts' },
                    { name: '1 cup mixed berries', substitutes: 'Any fresh or frozen fruit' },
                    { name: '2 tbsp honey', substitutes: 'Maple syrup or agave' },
                    { name: 'Chia seeds', substitutes: 'Flax seeds or hemp hearts' }
                ],
                instructions: [
                    'Layer Greek yogurt in a glass or bowl.',
                    'Add a layer of fresh berries.',
                    'Sprinkle with granola.',
                    'Repeat layers.',
                    'Drizzle with honey and chia seeds.',
                    'Serve immediately or refrigerate overnight.'
                ]
            },
            {
                name: 'Veggie Omelette',
                time: '15 min',
                nutrition: { calories: 340, protein: '22g', carbs: '8g', fat: '26g' },
                ingredients: [
                    { name: '3 eggs', substitutes: 'Egg whites or JUST Egg' },
                    { name: '1/4 cup bell peppers', substitutes: 'Zucchini or tomatoes' },
                    { name: '1/4 cup spinach', substitutes: 'Kale or arugula' },
                    { name: '2 tbsp cheese', substitutes: 'Dairy-free cheese' },
                    { name: '1 tbsp butter', substitutes: 'Olive oil' }
                ],
                instructions: [
                    'Whisk eggs with salt and pepper.',
                    'Heat butter in a non-stick pan over medium heat.',
                    'Add vegetables and sauté 2 minutes.',
                    'Pour eggs over vegetables.',
                    'Cook until edges set, then fold in half.',
                    'Top with cheese and serve.'
                ]
            },
            {
                name: 'Overnight Oats',
                time: '5 min prep',
                nutrition: { calories: 350, protein: '12g', carbs: '55g', fat: '10g' },
                ingredients: [
                    { name: '1/2 cup rolled oats', substitutes: 'Steel-cut oats (increase liquid)' },
                    { name: '1/2 cup milk', substitutes: 'Any plant-based milk' },
                    { name: '1/2 cup Greek yogurt', substitutes: 'More milk or coconut cream' },
                    { name: '1 tbsp chia seeds', substitutes: 'Flax meal' },
                    { name: '1 tbsp maple syrup', substitutes: 'Honey or mashed banana' },
                    { name: 'Fresh fruit for topping', substitutes: 'Nuts or dried fruit' }
                ],
                instructions: [
                    'Combine oats, milk, yogurt, and chia seeds in a jar.',
                    'Add maple syrup and stir well.',
                    'Cover and refrigerate overnight (or at least 4 hours).',
                    'In the morning, stir and add more milk if needed.',
                    'Top with fresh fruit and enjoy cold or heated.'
                ]
            },
            {
                name: 'Banana Pancakes',
                time: '20 min',
                nutrition: { calories: 420, protein: '14g', carbs: '62g', fat: '14g' },
                ingredients: [
                    { name: '1 cup flour', substitutes: 'Oat flour or almond flour' },
                    { name: '1 ripe banana, mashed', substitutes: 'Applesauce or pumpkin puree' },
                    { name: '1 egg', substitutes: 'Flax egg' },
                    { name: '3/4 cup milk', substitutes: 'Any non-dairy milk' },
                    { name: '1 tbsp maple syrup', substitutes: 'Honey' },
                    { name: 'Butter for cooking', substitutes: 'Coconut oil' }
                ],
                instructions: [
                    'Mix flour with baking powder and a pinch of salt.',
                    'In another bowl, combine mashed banana, egg, milk, and maple syrup.',
                    'Add wet ingredients to dry and mix until just combined.',
                    'Heat butter in a pan over medium heat.',
                    'Pour 1/4 cup batter per pancake.',
                    'Cook until bubbles form, flip and cook 2 more minutes.',
                    'Serve with fresh banana slices and maple syrup.'
                ]
            }
        ],
        lunch: [
            {
                name: 'Mediterranean Quinoa Bowl',
                time: '25 min',
                nutrition: { calories: 420, protein: '16g', carbs: '52g', fat: '18g' },
                ingredients: [
                    { name: '1 cup cooked quinoa', substitutes: 'Brown rice or farro' },
                    { name: '1/2 cup chickpeas', substitutes: 'White beans or lentils' },
                    { name: '1 cup cucumber and tomato', substitutes: 'Any raw vegetables' },
                    { name: '1/4 cup feta cheese', substitutes: 'Goat cheese or vegan feta' },
                    { name: '2 tbsp olive oil', substitutes: 'Tahini dressing' },
                    { name: 'Fresh herbs', substitutes: 'Dried oregano' }
                ],
                instructions: [
                    'Cook quinoa according to package directions and let cool.',
                    'Dice cucumber and tomatoes.',
                    'Combine quinoa, chickpeas, and vegetables in a bowl.',
                    'Drizzle with olive oil and lemon juice.',
                    'Top with crumbled feta and fresh herbs.',
                    'Season with salt and pepper to taste.'
                ]
            },
            {
                name: 'Chicken Caesar Salad',
                time: '20 min',
                nutrition: { calories: 480, protein: '38g', carbs: '18g', fat: '30g' },
                ingredients: [
                    { name: '6 oz grilled chicken breast', substitutes: 'Grilled shrimp or chickpeas' },
                    { name: '4 cups romaine lettuce', substitutes: 'Kale or mixed greens' },
                    { name: '1/4 cup parmesan cheese', substitutes: 'Nutritional yeast' },
                    { name: '1/2 cup croutons', substitutes: 'Toasted nuts' },
                    { name: '3 tbsp Caesar dressing', substitutes: 'Greek yogurt-based dressing' }
                ],
                instructions: [
                    'Season chicken with salt and pepper.',
                    'Grill or pan-sear chicken until cooked through.',
                    'Let chicken rest, then slice.',
                    'Chop romaine lettuce and place in a large bowl.',
                    'Add dressing and toss to coat.',
                    'Top with sliced chicken, parmesan, and croutons.'
                ]
            },
            {
                name: 'Turkey Avocado Wrap',
                time: '10 min',
                nutrition: { calories: 420, protein: '28g', carbs: '38g', fat: '20g' },
                ingredients: [
                    { name: '1 large flour tortilla', substitutes: 'Lettuce wraps for low-carb' },
                    { name: '4 oz sliced turkey', substitutes: 'Chicken, ham, or hummus' },
                    { name: '1/2 avocado, sliced', substitutes: 'Guacamole' },
                    { name: 'Lettuce and tomato', substitutes: 'Spinach and cucumber' },
                    { name: '1 tbsp mayo or mustard', substitutes: 'Greek yogurt spread' }
                ],
                instructions: [
                    'Lay tortilla flat and spread with mayo or mustard.',
                    'Layer turkey slices in the center.',
                    'Add avocado slices, lettuce, and tomato.',
                    'Season with salt and pepper.',
                    'Fold in sides and roll tightly.',
                    'Slice in half diagonally and serve.'
                ]
            },
            {
                name: 'Vegetable Soup',
                time: '35 min',
                nutrition: { calories: 280, protein: '12g', carbs: '42g', fat: '8g' },
                ingredients: [
                    { name: '4 cups vegetable broth', substitutes: 'Chicken broth' },
                    { name: '2 cups mixed vegetables', substitutes: 'Whatever you have on hand' },
                    { name: '1 cup diced potatoes', substitutes: 'White beans or pasta' },
                    { name: '1 can diced tomatoes', substitutes: 'Fresh tomatoes' },
                    { name: 'Herbs and seasonings', substitutes: 'Italian seasoning blend' }
                ],
                instructions: [
                    'Heat oil in a large pot over medium heat.',
                    'Sauté onions and garlic until softened.',
                    'Add all vegetables and stir to coat.',
                    'Pour in broth and tomatoes.',
                    'Bring to a boil, then reduce heat and simmer 25 minutes.',
                    'Season to taste and serve with crusty bread.'
                ]
            },
            {
                name: 'Asian Chicken Salad',
                time: '20 min',
                nutrition: { calories: 380, protein: '32g', carbs: '24g', fat: '20g' },
                ingredients: [
                    { name: '6 oz grilled chicken', substitutes: 'Edamame or crispy tofu' },
                    { name: '4 cups napa cabbage', substitutes: 'Regular cabbage or lettuce' },
                    { name: '1/2 cup mandarin oranges', substitutes: 'Fresh orange segments' },
                    { name: '1/4 cup sliced almonds', substitutes: 'Cashews or peanuts' },
                    { name: '3 tbsp sesame ginger dressing', substitutes: 'Peanut dressing' },
                    { name: 'Crispy wontons', substitutes: 'Rice noodles' }
                ],
                instructions: [
                    'Slice chicken into strips.',
                    'Shred cabbage and place in a large bowl.',
                    'Add mandarin oranges and almonds.',
                    'Top with sliced chicken.',
                    'Drizzle with dressing and toss.',
                    'Top with crispy wontons and serve.'
                ]
            }
        ],
        dinner: [
            {
                name: 'Lemon Herb Grilled Salmon',
                time: '25 min',
                nutrition: { calories: 420, protein: '40g', carbs: '12g', fat: '24g' },
                ingredients: [
                    { name: '2 salmon fillets (6 oz each)', substitutes: 'Trout or arctic char' },
                    { name: '2 tbsp olive oil', substitutes: 'Avocado oil' },
                    { name: '1 lemon, juiced', substitutes: 'Lime juice' },
                    { name: 'Fresh dill and parsley', substitutes: 'Dried herbs' },
                    { name: '2 cloves garlic, minced', substitutes: 'Garlic powder' },
                    { name: 'Asparagus or green beans', substitutes: 'Broccoli or zucchini' }
                ],
                instructions: [
                    'Preheat grill or oven to 400°F.',
                    'Mix olive oil, lemon juice, garlic, and herbs.',
                    'Brush salmon with herb mixture.',
                    'Grill or bake 12-15 minutes until salmon flakes.',
                    'Grill vegetables alongside or roast in oven.',
                    'Serve salmon over vegetables with lemon wedges.'
                ]
            },
            {
                name: 'Chicken Stir Fry',
                time: '20 min',
                nutrition: { calories: 380, protein: '32g', carbs: '28g', fat: '16g' },
                ingredients: [
                    { name: '1 lb chicken breast, sliced', substitutes: 'Tofu or shrimp' },
                    { name: '3 cups stir fry vegetables', substitutes: 'Any vegetables' },
                    { name: '3 tbsp soy sauce', substitutes: 'Coconut aminos' },
                    { name: '1 tbsp sesame oil', substitutes: 'Vegetable oil' },
                    { name: '2 cloves garlic, minced', substitutes: 'Garlic powder' },
                    { name: '1 tbsp ginger, grated', substitutes: 'Ground ginger' }
                ],
                instructions: [
                    'Slice chicken into thin strips.',
                    'Heat oil in wok over high heat.',
                    'Cook chicken 5-6 minutes until done. Remove.',
                    'Add vegetables and stir fry 3-4 minutes.',
                    'Add garlic and ginger, cook 30 seconds.',
                    'Return chicken, add soy sauce and sesame oil.',
                    'Serve over rice or noodles.'
                ]
            },
            {
                name: 'Beef Tacos',
                time: '25 min',
                nutrition: { calories: 480, protein: '28g', carbs: '42g', fat: '24g' },
                ingredients: [
                    { name: '1 lb ground beef', substitutes: 'Ground turkey or black beans' },
                    { name: '8 small corn tortillas', substitutes: 'Flour tortillas or lettuce cups' },
                    { name: 'Taco seasoning', substitutes: 'Cumin, chili powder, paprika' },
                    { name: 'Toppings: lettuce, tomato, cheese', substitutes: 'Any taco toppings' },
                    { name: 'Salsa and sour cream', substitutes: 'Greek yogurt, hot sauce' }
                ],
                instructions: [
                    'Brown ground beef in a skillet, breaking apart.',
                    'Drain excess fat.',
                    'Add taco seasoning and water per package.',
                    'Simmer 5 minutes until thickened.',
                    'Warm tortillas in a dry pan or microwave.',
                    'Fill tortillas with meat and desired toppings.',
                    'Serve with salsa and sour cream.'
                ]
            },
            {
                name: 'Pasta Primavera',
                time: '30 min',
                nutrition: { calories: 420, protein: '14g', carbs: '62g', fat: '14g' },
                ingredients: [
                    { name: '12 oz pasta', substitutes: 'Gluten-free pasta or zoodles' },
                    { name: '3 cups mixed vegetables', substitutes: 'Any seasonal vegetables' },
                    { name: '3 cloves garlic, minced', substitutes: 'Garlic powder' },
                    { name: '1/4 cup olive oil', substitutes: 'Butter' },
                    { name: '1/2 cup parmesan cheese', substitutes: 'Nutritional yeast' },
                    { name: 'Fresh basil', substitutes: 'Dried Italian herbs' }
                ],
                instructions: [
                    'Cook pasta according to package. Reserve pasta water.',
                    'Sauté vegetables in olive oil until tender.',
                    'Add garlic and cook 1 minute.',
                    'Add drained pasta to vegetables.',
                    'Toss with parmesan and pasta water as needed.',
                    'Season and top with fresh basil.'
                ]
            },
            {
                name: 'Vegetable Curry',
                time: '35 min',
                nutrition: { calories: 380, protein: '12g', carbs: '48g', fat: '18g' },
                ingredients: [
                    { name: '2 cups mixed vegetables', substitutes: 'Any vegetables you prefer' },
                    { name: '1 can coconut milk', substitutes: 'Heavy cream or cashew cream' },
                    { name: '2 tbsp curry paste or powder', substitutes: 'Garam masala blend' },
                    { name: '1 can chickpeas', substitutes: 'Tofu or paneer' },
                    { name: '1 onion, diced', substitutes: 'Shallots' },
                    { name: 'Fresh cilantro', substitutes: 'Parsley' }
                ],
                instructions: [
                    'Sauté onion until softened.',
                    'Add curry paste and cook 1 minute until fragrant.',
                    'Add vegetables and stir to coat.',
                    'Pour in coconut milk and bring to simmer.',
                    'Add chickpeas and cook 15-20 minutes.',
                    'Season to taste and serve over rice.',
                    'Garnish with fresh cilantro.'
                ]
            }
        ]
    };

    const mealPlan = {};
    const daysInMonth = new Date(AppState.currentYear, AppState.currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${AppState.currentYear}-${String(AppState.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPlan = {};

        // Only include selected meal types
        if (AppState.mealTypes.breakfast) {
            const meal = mealDatabase.breakfast[Math.floor(Math.random() * mealDatabase.breakfast.length)];
            dayPlan.breakfast = {
                id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...meal,
                servings: AppState.filters.servings,
                difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1]
            };
        }

        if (AppState.mealTypes.lunch) {
            const meal = mealDatabase.lunch[Math.floor(Math.random() * mealDatabase.lunch.length)];
            dayPlan.lunch = {
                id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...meal,
                servings: AppState.filters.servings,
                difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1]
            };
        }

        if (AppState.mealTypes.dinner) {
            const meal = mealDatabase.dinner[Math.floor(Math.random() * mealDatabase.dinner.length)];
            dayPlan.dinner = {
                id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...meal,
                servings: AppState.filters.servings,
                difficulty: ['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1]
            };
        }

        mealPlan[dateKey] = dayPlan;
    }

    return JSON.stringify({ mealPlan });
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
        const prompt = `Create a delicious recipe using these ingredients: ${ingredients}

${getFilterPrompt()}

You MUST respond with ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "id": "recipe_${Date.now()}",
  "name": "Recipe Name",
  "time": "cook time (e.g., 30 min)",
  "servings": ${AppState.filters.servings},
  "difficulty": "${['Beginner', 'Intermediate', 'Advanced'][AppState.filters.difficulty - 1]}",
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
        const recipe = safeJSONParse(response);

        if (!recipe || !recipe.name) {
            throw new Error('Invalid recipe format received');
        }

        // Ensure recipe has an ID
        if (!recipe.id) {
            recipe.id = 'recipe_' + Date.now();
        }

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
    if (!recipe) {
        console.error('No recipe to display');
        return;
    }

    // Update title
    document.getElementById('recipe-title').textContent = recipe.name || 'Untitled Recipe';

    // Update meta
    document.getElementById('recipe-time').textContent = recipe.time || '30 min';
    document.getElementById('recipe-servings').textContent = `${recipe.servings || 2} servings`;
    document.getElementById('recipe-difficulty').textContent = recipe.difficulty || 'Intermediate';

    // Update nutrition (with defaults)
    const nutrition = recipe.nutrition || {};
    document.getElementById('calories').textContent = nutrition.calories || '---';
    document.getElementById('protein').textContent = nutrition.protein || '---';
    document.getElementById('carbs').textContent = nutrition.carbs || '---';
    document.getElementById('fat').textContent = nutrition.fat || '---';

    // Update ingredients
    const ingredientsList = document.getElementById('recipe-ingredients');
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ingredientsList.innerHTML = ingredients.map(ing => {
        const name = typeof ing === 'string' ? ing : ing.name;
        const substitutes = typeof ing === 'object' ? ing.substitutes : 'No substitutes listed';
        return `
            <li class="ingredient-item" data-substitutes="Substitutes: ${substitutes || 'No substitutes listed'}">
                ${name}
            </li>
        `;
    }).join('');

    // Update instructions
    const instructionsList = document.getElementById('recipe-instructions');
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
    instructionsList.innerHTML = instructions.map((step, index) => `
        <div class="instruction-step" data-step="${index + 1}">
            <span class="step-number">${index + 1}</span>
            <div class="step-content">${step}</div>
        </div>
    `).join('');

    // Update favorite button
    const favoriteBtn = DOM.recipeResult?.querySelector('.favorite-btn');
    if (favoriteBtn && recipe.id) {
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
Respond with ONLY valid JSON (no markdown):
{
  "suggestions": [
    {"name": "ingredient", "reason": "why this helps"}
  ]
}`;

        const response = await callAI(prompt);
        const data = safeJSONParse(response);

        if (!data || !data.suggestions) {
            throw new Error('Invalid response format');
        }

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
        console.error('Missing ingredients error:', error);
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
    // Check if at least one meal type is selected
    const selectedMeals = Object.entries(AppState.mealTypes)
        .filter(([_, selected]) => selected)
        .map(([type, _]) => type);

    if (selectedMeals.length === 0) {
        showToast('Please select at least one meal type', 'error');
        return;
    }

    showLoading('Creating your monthly meal plan...');

    try {
        const monthName = new Date(AppState.currentYear, AppState.currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

        const prompt = `Generate a complete monthly meal plan for ${monthName}.

${getFilterPrompt()}

Include ONLY these meals: ${selectedMeals.join(', ')}

For each day, provide meals with full recipe details including ingredients with substitutes and step-by-step instructions.`;

        const response = await callAI(prompt);
        const data = safeJSONParse(response);

        if (!data || !data.mealPlan) {
            throw new Error('Invalid response format');
        }

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

Respond with ONLY valid JSON (no markdown):
{
  "tips": [
    {"title": "tip title", "content": "detailed tip", "icon": "emoji"}
  ]
}`;

        const response = await callAI(prompt);
        const data = safeJSONParse(response);

        if (!data || !data.tips) {
            throw new Error('Invalid tips format');
        }

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
        // Show default tips on error
        DOM.tipsList.innerHTML = `
            <div class="tip-item">
                <span class="tip-icon">🔪</span>
                <div class="tip-content">
                    <h4>Prep Ingredients Ahead</h4>
                    <p>Spend time on weekends prepping vegetables for the week. Store in airtight containers for quick weeknight cooking.</p>
                </div>
            </div>
            <div class="tip-item">
                <span class="tip-icon">🧂</span>
                <div class="tip-content">
                    <h4>Season as You Go</h4>
                    <p>Add salt in layers throughout cooking rather than all at the end. This builds deeper, more complex flavors.</p>
                </div>
            </div>
            <div class="tip-item">
                <span class="tip-icon">🌡️</span>
                <div class="tip-content">
                    <h4>Let Proteins Rest</h4>
                    <p>After cooking, let meat rest for 5-10 minutes. This allows juices to redistribute for more tender results.</p>
                </div>
            </div>
        `;
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

        let mealsHTML = '';
        if (meals) {
            if (meals.breakfast) {
                mealsHTML += `<div class="meal-item breakfast" onclick="openMealModal('${dateKey}', 'breakfast')">${meals.breakfast.name}</div>`;
            }
            if (meals.lunch) {
                mealsHTML += `<div class="meal-item lunch" onclick="openMealModal('${dateKey}', 'lunch')">${meals.lunch.name}</div>`;
            }
            if (meals.dinner) {
                mealsHTML += `<div class="meal-item dinner" onclick="openMealModal('${dateKey}', 'dinner')">${meals.dinner.name}</div>`;
            }
        }

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateKey}">
                <span class="day-number">${day}</span>
                <div class="day-meals">${mealsHTML}</div>
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
    if (!recipe) {
        console.error('No recipe to display in modal');
        return;
    }

    document.getElementById('modal-recipe-title').textContent = recipe.name || 'Untitled Recipe';
    document.getElementById('modal-recipe-time').textContent = recipe.time || '30 min';
    document.getElementById('modal-recipe-servings').textContent = `${recipe.servings || 2} servings`;
    document.getElementById('modal-recipe-difficulty').textContent = recipe.difficulty || 'Intermediate';

    // Update nutrition (with defaults)
    const nutrition = recipe.nutrition || {};
    document.getElementById('modal-calories').textContent = nutrition.calories || '---';
    document.getElementById('modal-protein').textContent = nutrition.protein || '---';
    document.getElementById('modal-carbs').textContent = nutrition.carbs || '---';
    document.getElementById('modal-fat').textContent = nutrition.fat || '---';

    const ingredientsList = document.getElementById('modal-ingredients');
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ingredientsList.innerHTML = ingredients.map(ing => {
        const name = typeof ing === 'string' ? ing : ing.name;
        const substitutes = typeof ing === 'object' ? ing.substitutes : 'No substitutes listed';
        return `
            <li class="ingredient-item" data-substitutes="Substitutes: ${substitutes || 'No substitutes listed'}">
                ${name}
            </li>
        `;
    }).join('');

    const instructionsList = document.getElementById('modal-instructions');
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];
    instructionsList.innerHTML = instructions.map((step, index) => `
        <div class="instruction-step" data-step="${index + 1}">
            <span class="step-number">${index + 1}</span>
            <div class="step-content">${step}</div>
        </div>
    `).join('');

    const favoriteBtn = DOM.modal?.querySelector('.favorite-btn');
    if (favoriteBtn && recipe.id) {
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

/**
 * Open the settings modal
 */
function openSettingsModal() {
    DOM.settingsModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateApiStatus();
}

/**
 * Close the settings modal
 */
function closeSettingsModal() {
    DOM.settingsModal?.classList.remove('open');
    document.body.style.overflow = '';
}

/**
 * Save API key from input
 */
function saveApiKey() {
    const key = DOM.apiKeyInput?.value.trim();

    if (!key) {
        showToast('Please enter an API key', 'error');
        return;
    }

    if (!key.startsWith('sk-')) {
        showToast('Invalid API key format. Should start with "sk-"', 'error');
        return;
    }

    API_CONFIG.apiKey = key;
    DOM.apiKeyInput.value = '';
    updateApiStatus();
    showToast('API key saved for this session!', 'success');
}

/**
 * Clear stored API key
 */
function clearApiKey() {
    sessionStorage.removeItem('openai_api_key');
    DOM.apiKeyInput.value = '';
    updateApiStatus();
    showToast('API key cleared. Using demo mode.', 'success');
}

/**
 * Update the API status display
 */
function updateApiStatus() {
    const statusIndicator = DOM.apiStatus?.querySelector('.status-indicator');
    if (statusIndicator) {
        if (API_CONFIG.apiKey) {
            statusIndicator.textContent = 'API key set ✓';
            statusIndicator.classList.add('active');
        } else {
            statusIndicator.textContent = 'No API key set (using demo mode)';
            statusIndicator.classList.remove('active');
        }
    }
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
        produce: ['vegetable', 'vegetables', 'fruit', 'lettuce', 'romaine', 'tomato', 'tomatoes', 'onion', 'garlic', 'pepper', 'peppers', 'carrot', 'broccoli', 'spinach', 'cucumber', 'lemon', 'lime', 'apple', 'banana', 'berry', 'berries', 'avocado', 'potato', 'potatoes', 'mushroom', 'zucchini', 'celery', 'herbs', 'basil', 'cilantro', 'parsley', 'mint', 'dill', 'thyme', 'rosemary', 'cabbage', 'asparagus', 'green beans', 'kale', 'arugula', 'ginger', 'mandarin', 'orange'],
        protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'turkey', 'tofu', 'tempeh', 'egg', 'eggs', 'meat', 'steak', 'sausage', 'chickpeas', 'chickpea', 'beans', 'lentils', 'trout'],
        dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'feta', 'parmesan', 'mozzarella', 'cheddar', 'sour cream', 'greek yogurt'],
        grains: ['bread', 'rice', 'pasta', 'spaghetti', 'penne', 'quinoa', 'oat', 'oats', 'flour', 'tortilla', 'tortillas', 'noodle', 'noodles', 'cereal', 'couscous', 'granola', 'croutons', 'wontons'],
        spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'seasoning', 'spice', 'curry', 'taco seasoning', 'italian seasoning', 'cinnamon'],
        pantry: ['oil', 'olive oil', 'vinegar', 'sauce', 'soy sauce', 'broth', 'stock', 'can', 'canned', 'honey', 'sugar', 'maple syrup', 'syrup', 'nut', 'nuts', 'almonds', 'seed', 'seeds', 'chia', 'coconut milk', 'mustard', 'mayo', 'mayonnaise', 'dressing', 'salsa', 'hot sauce']
    };

    // Extract ingredients from meal plan for the current month only
    const currentMonthPrefix = `${AppState.currentYear}-${String(AppState.currentMonth + 1).padStart(2, '0')}`;

    Object.entries(AppState.mealPlan).forEach(([dateKey, day]) => {
        // Only include current month's meals
        if (!dateKey.startsWith(currentMonthPrefix)) return;

        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const meal = day[mealType];
            if (meal?.ingredients && Array.isArray(meal.ingredients)) {
                meal.ingredients.forEach(ing => {
                    if (!ing.name) return;

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
        filters: AppState.filters,
        mealTypes: AppState.mealTypes
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

        if (data.mealTypes) {
            AppState.mealTypes = { ...AppState.mealTypes, ...data.mealTypes };
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
