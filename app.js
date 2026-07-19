const SUPABASE_URL = "https://wywfqdlrlncvqvxznshm.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_PZ56ks1RrEOtoOw14hb2jg_-3zaZA3b"; 
const ADMIN_PASSWORD = "DeuceAdmin2026"; 

// Initialisation du client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let articles = []; 
let currentPage = 'home'; 
let isAdmin = JSON.parse(localStorage.getItem('deuce_is_admin')) || false;
let uploadedImageFile = null;
let showAllHomeArticles = false; 

// Variables pour la traduction dynamique (sans toucher à la BDD)
let currentModalLang = 'fr';
let originalFrenchContent = '';
let originalFrenchTitle = '';

// --- CHARGEMENT DES ARTICLES DEPUIS SUPABASE ---
async function loadArticles() {
    try {
        const { data, error } = await _supabase
            .from('articles')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;
        articles = data || [];
        renderArticles();

        // --- ROUTAGE INITIAL : Vérifie si un article est demandé dans l'URL ---
        checkUrlForArticle();
    } catch (err) {
        console.error("Erreur lors de la récupération des articles Supabase :", err);
    }
}

// --- VERIFICATION DES PARAMETRES D'URL ---
function checkUrlForArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('article');
    if (articleId) {
        const idInt = parseInt(articleId, 10);
        if (!isNaN(idInt)) {
            // Un court délai permet de s'assurer que le DOM est complètement prêt
            setTimeout(() => {
                openArticle(idInt, false); // false pour ne pas ré-écrire l'historique inutilement au chargement
            }, 100);
        }
    }
}

// Ecoute les boutons "Retour" ou "Avancer" du navigateur pour synchroniser le modal
window.addEventListener('popstate', function(event) {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('article');
    if (articleId) {
        openArticle(parseInt(articleId, 10), false);
    } else {
        toggleReadModal(false);
    }
});

// --- RENDU DES CARTES D'ARTICLES ---
function renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    container.innerHTML = '';

    // --- CAS PARTICULIER : PAGE À PROPOS ---
    if (currentPage === 'about') {
        const countElem = document.getElementById('article-count');
        if (countElem) countElem.textContent = ""; 
        removeMoreButton();

        container.innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-3xl mx-auto space-y-6 text-slate-700 leading-relaxed">
                <p class="text-lg font-semibold text-emerald-900">Bienvenue sur Deuce Tennis ! 🎾</p>
                <p>
                    Lancé par des passionnés de la petite balle jaune, <strong>Deuce Tennis</strong> est un média indépendant 
                    dont le but est de décrypter l'actualité des circuits internationaux. Des courts prestigieux de l'ATP aux 
                    combats acharnés de la WTA, sans oublier les espoirs qui font leurs armes sur le circuit ITF, nous couvrons le tennis sous toutes ses facettes.
                </p>
                <p>
                    Notre philosophie ? Proposer des contenus de qualité, des analyses tactiques fouillées et des portraits inspirants, 
                    le tout sur une plateforme moderne, rapide et accessible à tous les fans de sport.
                </p>
                <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>© ${new Date().getFullYear()} Deuce Tennis - Tous droits réservés</span>
                    <span>Créé avec Passion 💻</span>
                </div>
            </div>
        `;
        return; 
    }

    // Filtrage classique des articles (inclut la gestion de 'portrait' renommé Édition spéciale)
    let filtered = currentPage === 'home' 
        ? articles 
        : articles.filter(art => art.category.toLowerCase() === currentPage);

    const totalFilteredCount = filtered.length;

    if (currentPage === 'home' && !showAllHomeArticles) {
        filtered = filtered.slice(0, 3); 
    }

    const countElem = document.getElementById('article-count');
    if (countElem) countElem.textContent = `${totalFilteredCount} article(s)`;

    if (totalFilteredCount === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 text-slate-400">
                <i class="fa-regular fa-folder-open text-5xl mb-3 block"></i>
                <p class="text-sm font-semibold">Aucun article dans cet espace pour le moment.</p>
            </div>
        `;
        removeMoreButton();
        return;
    }

    filtered.forEach(art => {
        const badgeColor = art.category === 'ATP' ? 'bg-blue-100 text-blue-800' : 
                           art.category === 'WTA' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800';

        const deleteButtonHTML = isAdmin ? `
            <button onclick="event.stopPropagation(); deleteArticle(${art.id})" class="absolute top-3 right-3 bg-red-500 hover:bg-red-6
