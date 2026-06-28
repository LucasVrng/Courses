import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
    'https://pohhpdacnkreooqvqbwb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaGhwZGFjbmtyZW9vcXZxYndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzE5MzksImV4cCI6MjA5NzM0NzkzOX0.Avhs1xJXYe_HYcJp_HGg0sZb-qveOGupxDyYPg7WTqQ'
)

const categoriesIcons = {
    "Conserves": "🥫",
    "Céréales": "🥣",
    "Boulangerie": "🥖",
    "Boissons": "🥛",
    "Produits Frais": "🍧"
}

// --- Verrou par mot de passe familial ---
const STORAGE_KEY = "shopping_list_authenticated"
const PASSWORD_HASH = "COLLE_ICI_TON_HASH"

const gateDiv = document.getElementById("passwordGate")
const appContent = document.getElementById("appContent")
const gatePasswordInput = document.getElementById("gatePassword")
const gateSubmitBtn = document.getElementById("gateSubmit")
const gateError = document.getElementById("gateError")

async function sha256(text) {
    const data = new TextEncoder().encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

function unlockApp() {
    gateDiv.classList.add("hidden")
    appContent.classList.remove("hidden")
    init()
}

async function checkPassword() {
    const hash = await sha256(gatePasswordInput.value)

    if (hash === PASSWORD_HASH) {
        localStorage.setItem(STORAGE_KEY, "true")
        unlockApp()
    } else {
        gateError.classList.remove("hidden")
        gatePasswordInput.value = ""
    }
}

gateSubmitBtn.addEventListener("click", checkPassword)
gatePasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPassword()
})

if (localStorage.getItem(STORAGE_KEY) === "true") {
    unlockApp()
} else {
    gateDiv.classList.remove("hidden")
}

// --- Éléments du DOM ---
const resetBtn = document.getElementById("resetBtn")
const backBtn = document.getElementById("backBtn")
const searchBar = document.getElementById("searchBar")

const locationsSection = document.getElementById("locations")
const cuisineDiv = document.getElementById("cuisine")
const frigoDiv = document.getElementById("frigo")
const salleDeBainDiv = document.getElementById("salleDeBain")
const cellierDiv = document.getElementById("cellier")
const autresDiv = document.getElementById("autres")

const locationProductsSection = document.getElementById("locationProducts")
const locationProductsTitle = document.getElementById("locationProductsTitle")
const locationProductsList = document.getElementById("locationProductsList")

const searchResultsSection = document.getElementById("searchResults")
const searchResultsList = document.getElementById("searchResultsList")

const missingProductsList = document.getElementById("missingProductsList")

const locationDivs = {
    "Cuisine": cuisineDiv,
    "Frigo": frigoDiv,
    "Salle de bain": salleDeBainDiv,
    "Cellier": cellierDiv,
    "Autres": autresDiv
}

// --- État global ---
let productsCache = []
let currentView = "locations" // "locations" | "location" | "search"
let currentLocationName = null

// --- Source de vérité unique : une seule section visible à la fois ---
function setActiveView(view) {
    currentView = view

    locationsSection.classList.toggle("hidden", view !== "locations")
    locationProductsSection.classList.toggle("hidden", view !== "location")
    searchResultsSection.classList.toggle("hidden", view !== "search")
    backBtn.classList.toggle("hidden", view === "locations")
}

function clearLocationHighlight() {
    Object.values(locationDivs).forEach(div => div.classList.remove("active"))
}

// --- Évènements ---
resetBtn.addEventListener("click", async () => {
    if (window.confirm("Voulez vous vraiment réinitialiser la liste des produits manquants?")) {
        await resetShoppingList()
        productsCache.forEach(p => p.is_missing = false)
        renderMissingSection()
        renderCurrentView()
    }
})

backBtn.addEventListener("click", () => {
    showLocationsView()
})

Object.entries(locationDivs).forEach(([name, div]) => {
    div.addEventListener("click", () => {
        showLocationProductsView(name)
    })
})

searchBar.addEventListener("input", () => {
    const query = searchBar.value.trim()

    if (query === "") {
        // on vide vraiment le contenu, pas seulement la vue
        searchResultsList.innerHTML = ""
        showLocationsView()
        return
    }

    showSearchResultsView(query)
})

// --- Navigation entre vues ---
function showLocationsView() {
    currentLocationName = null
    searchBar.value = ""
    searchResultsList.innerHTML = ""
    clearLocationHighlight()
    setActiveView("locations")
}

function showLocationProductsView(locationName) {
    // on repart d'un état propre côté recherche
    searchBar.value = ""
    searchResultsList.innerHTML = ""

    currentLocationName = locationName
    clearLocationHighlight()
    if (locationDivs[locationName]) {
        locationDivs[locationName].classList.add("active")
    }

    setActiveView("location")
    renderLocationProducts(locationName)
}

function showSearchResultsView(query) {
    // on repart d'un état propre côté emplacement
    currentLocationName = null
    clearLocationHighlight()
    locationProductsList.innerHTML = ""

    setActiveView("search")
    renderSearchResults(query)
}

function renderCurrentView() {
    if (currentView === "location") {
        renderLocationProducts(currentLocationName)
    } else if (currentView === "search") {
        renderSearchResults(searchBar.value.trim())
    }
}

// --- Création d'un élément produit (réutilisé partout) ---
function createProductElement(product) {
    const productDiv = document.createElement("div")
    productDiv.classList.add("product")

    if (product.is_missing) {
        productDiv.classList.add("is_missing")
    }

    productDiv.innerHTML = `
        <p class="product-name">${product.name}</p>
        <p class="product-location">${product.Locations.name}</p>
    `

    productDiv.addEventListener("click", () => {
        toggleMissing(product)
    })

    return productDiv
}

// --- Rendu : produits d'un emplacement ---
function renderLocationProducts(locationName) {
    locationProductsTitle.textContent = `Produits - ${locationName}`
    locationProductsList.innerHTML = ""

    const matching = productsCache.filter(p => p.Locations.name === locationName)

    if (matching.length === 0) {
        locationProductsList.innerHTML = "<p>Aucun produit dans cet emplacement.</p>"
        return
    }

    matching.forEach(product => {
        locationProductsList.appendChild(createProductElement(product))
    })
}

// --- Rendu : résultats de recherche (sur tous les produits) ---
function renderSearchResults(query) {
    searchResultsList.innerHTML = ""

    if (!query) return

    const normalized = query.toLowerCase()
    const matching = productsCache.filter(p =>
        p.name.toLowerCase().includes(normalized)
    )

    if (matching.length === 0) {
        searchResultsList.innerHTML = "<p>Aucun produit trouvé.</p>"
        return
    }

    matching.forEach(product => {
        searchResultsList.appendChild(createProductElement(product))
    })
}

// --- Rendu : section "A acheter" (toujours visible, toujours synchronisée) ---
function renderMissingSection() {
    missingProductsList.innerHTML = ""

    const missing = productsCache.filter(p => p.is_missing)

    if (missing.length === 0) {
        missingProductsList.innerHTML = "<p>Rien à acheter pour le moment.</p>"
        return
    }

    missing.forEach(product => {
        missingProductsList.appendChild(createProductElement(product))
    })
}

// --- Action : ajouter / retirer un produit de la liste de courses ---
async function toggleMissing(product) {
    const newValue = !product.is_missing

    const { error } = await supabase
        .from('Products')
        .update({ is_missing: newValue })
        .eq('id', product.id)

    if (error) {
        console.error(error)
        return
    }

    product.is_missing = newValue

    renderMissingSection()
    renderCurrentView()
}

// --- Chargement des données (une seule fois) ---
async function getProducts() {
    const { data, error } = await supabase
        .from('Products')
        .select(`
            id,
            name,
            is_missing,
            location_id,
            Locations ( name )
        `)
        .order('name')

    if (error) {
        console.error("Erreur Supabase :", error.message)
        return []
    }

    return data ?? []
}

async function resetShoppingList() {
    const { error } = await supabase
        .from('Products')
        .update({ is_missing: false })
        .neq('is_missing', false)

    if (error) {
        console.error(error)
        return
    }

    console.log("Liste réinitialisée !")
}

// --- Synchronisation temps réel entre les appareils ---
function subscribeToRealtimeUpdates() {
    supabase
        .channel('products-sync')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Products' },
            async () => {
                await refreshProducts()
            }
        )
        .subscribe()
}

async function refreshProducts() {
    productsCache = await getProducts()
    renderMissingSection()
    renderCurrentView()
}

// --- Initialisation ---
async function init() {
    productsCache = await getProducts()
    renderMissingSection()
    showLocationsView()
    subscribeToRealtimeUpdates()
}