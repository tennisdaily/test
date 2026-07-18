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
            <button onclick="event.stopPropagation(); deleteArticle(${art.id})" class="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition z-10">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>
        ` : '';

        const card = document.createElement('div');
        card.className = "bg-white rounded-xl shadow-sm hover:shadow-xl border border-slate-100 overflow-hidden transition duration-300 flex flex-col justify-between cursor-pointer relative";
        card.setAttribute('onclick', `openArticle(${art.id})`);
        
        card.innerHTML = `
            <div>
                <div class="relative h-48 overflow-hidden bg-slate-100">
                    <img src="${art.image}" alt="${art.title}" class="w-full h-full object-cover">
                    <span class="absolute top-3 left-3 text-xs font-bold uppercase px-2.5 py-1 rounded shadow ${badgeColor}">
                        ${art.category}
                    </span>
                    ${deleteButtonHTML}
                </div>
                <div class="p-5">
                    <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center">
                        <i class="fa-regular fa-calendar-days mr-1 text-emerald-600"></i> ${art.date}
                    </p>
                    <h3 class="font-bold text-lg text-slate-800 mb-2 leading-tight">${art.title}</h3>
                    <p class="text-sm text-slate-600 line-clamp-3 leading-relaxed">${art.content}</p>
                </div>
            </div>
            <div class="px-5 pb-5 pt-2 border-t border-slate-50 flex justify-end">
                <button class="text-emerald-700 hover:text-emerald-950 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition">
                    <span>Lire l'article</span>
                    <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    if (currentPage === 'home' && totalFilteredCount > 3 && !showAllHomeArticles) {
        createMoreButton();
    } else {
        removeMoreButton();
    }
}

// --- AJOUTER LE BOUTON "VOIR PLUS D'ARTICLES" ---
function createMoreButton() {
    let btn = document.getElementById('btn-load-more');
    if (btn) return; 

    const container = document.getElementById('articles-container');
    if (!container) return;

    btn = document.createElement('button');
    btn.id = 'btn-load-more';
    btn.className = "col-span-full mx-auto mt-8 px-6 py-3 bg-emerald-800 text-white rounded-lg hover:bg-emerald-950 transition font-bold text-sm shadow flex items-center gap-2";
    btn.innerHTML = `<span>Voir plus d'articles</span> <i class="fa-solid fa-chevron-down"></i>`;
    
    btn.onclick = function() {
        showAllHomeArticles = true;
        renderArticles();
    };

    container.after(btn);
}

// --- SUPPRIMER LE BOUTON "VOIR PLUS" ---
function removeMoreButton() {
    const btn = document.getElementById('btn-load-more');
    if (btn) btn.remove();
}

// --- OUVRIR ET LIRE UN ARTICLE COMPLET ---
function openArticle(id, updateHistory = true) {
    const art = articles.find(a => a.id === id);
    if (!art) return;

    // Réinitialisation de la langue
    currentModalLang = 'fr';
    originalFrenchContent = art.content;
    originalFrenchTitle = art.title;

    document.getElementById('read-image').src = art.image;
    document.getElementById('read-image').alt = art.title;
    document.getElementById('read-title').textContent = art.title;
    document.getElementById('read-content').textContent = art.content;
    document.getElementById('read-date').textContent = art.date;
    
    const badge = document.getElementById('read-category');
    badge.textContent = art.category;
    badge.className = art.category === 'ATP' ? 'font-bold uppercase px-2.5 py-1 rounded shadow bg-blue-100 text-blue-800' : 
                  art.category === 'WTA' ? 'font-bold uppercase px-2.5 py-1 rounded shadow bg-purple-100 text-purple-800' : 
                  'font-bold uppercase px-2.5 py-1 rounded shadow bg-amber-100 text-amber-800';

    // Injection de la zone de signature
    let signatureElem = document.getElementById('read-signature');
    if (!signatureElem) {
        signatureElem = document.createElement('div');
        signatureElem.id = 'read-signature';
        signatureElem.className = "mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold italic flex items-center gap-1.5";
        document.getElementById('read-content').after(signatureElem);
    }
    signatureElem.innerHTML = `<i class="fa-solid fa-pen-nib text-emerald-600"></i> Rédigé par l'équipe Deuce Tennis`;

    // Injection du bouton de traduction
    let translateBtn = document.getElementById('btn-translate-article');
    if (!translateBtn) {
        const headerContainer = document.getElementById('read-category').parentElement;
        translateBtn = document.createElement('button');
        translateBtn.id = 'btn-translate-article';
        translateBtn.className = "ml-3 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1";
        headerContainer.appendChild(translateBtn);
    }
    translateBtn.innerHTML = `<i class="fa-solid fa-language text-sm"></i> <span id="translate-btn-text">Translate to EN</span>`;
    translateBtn.onclick = function() { toggleArticleTranslation(); };

    // --- INTEGRATION BOUTON MODIFIER POUR ADMIN ---
    let editBtn = document.getElementById('btn-edit-article');
    if (editBtn) editBtn.remove();

    if (isAdmin) {
        const headerContainer = document.getElementById('read-category').parentElement;
        editBtn = document.createElement('button');
        editBtn.id = 'btn-edit-article';
        editBtn.className = "ml-3 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1";
        editBtn.innerHTML = `<i class="fa-solid fa-pen"></i> Modifier`;
        editBtn.onclick = function() { toggleEditMode(id); };
        headerContainer.appendChild(editBtn);
    }

    // Met à jour l'URL visible dans le navigateur sans recharger la page
    if (updateHistory) {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?article=' + id;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    toggleReadModal(true);
}

// --- PASSER EN MODE ÉDITION VISUELLE ---
function toggleEditMode(id) {
    const titleElem = document.getElementById('read-title');
    const contentElem = document.getElementById('read-content');
    const editBtn = document.getElementById('btn-edit-article');

    titleElem.contentEditable = true;
    contentElem.contentEditable = true;
    titleElem.classList.add('border-2', 'border-dashed', 'border-amber-400', 'p-1');
    contentElem.classList.add('border-2', 'border-dashed', 'border-amber-400', 'p-1');
    titleElem.focus();

    editBtn.className = "ml-3 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1";
    editBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Enregistrer`;
    editBtn.onclick = function() { saveArticleEdits(id); };
}

// --- SAUVEGARDER LES CORRECTIONS DANS SUPABASE ---
async function saveArticleEdits(id) {
    const titleElem = document.getElementById('read-title');
    const contentElem = document.getElementById('read-content');
    
    const updatedTitle = titleElem.textContent.trim();
    const updatedContent = contentElem.textContent.trim();

    try {
        const { error } = await _supabase
            .from('articles')
            .update({ title: updatedTitle, content: updatedContent })
            .eq('id', id);

        if (error) throw error;

        titleElem.contentEditable = false;
        contentElem.contentEditable = false;
        titleElem.classList.remove('border-2', 'border-dashed', 'border-amber-400', 'p-1');
        contentElem.classList.remove('border-2', 'border-dashed', 'border-amber-400', 'p-1');

        alert("Modifications enregistrées sur Deuce Tennis !");
        
        loadArticles(); 
    } catch (err) {
        alert("Erreur lors de la modification : " + err.message);
    }
}

// --- LOGIQUE DE TRADUCTION DYNAMIQUE AVEC PROXY ANTI-CORS ---
async function toggleArticleTranslation() {
    const titleElem = document.getElementById('read-title');
    const contentElem = document.getElementById('read-content');
    const btnText = document.getElementById('translate-btn-text');

    if (currentModalLang === 'fr') {
        btnText.textContent = "Translating...";
        try {
            const urlTitle = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(originalFrenchTitle)}`;
            const urlContent = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(originalFrenchContent)}`;

            const resTitle = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlTitle)}`);
            const resContent = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlContent)}`);
            
            const dataTitle = await resTitle.json();
            const dataContent = await resContent.json();
            
            const rawTitle = JSON.parse(dataTitle.contents);
            const rawContent = JSON.parse(dataContent.contents);

            titleElem.textContent = rawTitle[0].map(x => x[0]).join('');
            contentElem.textContent = rawContent[0].map(x => x[0]).join('');
            
            document.getElementById('read-signature').innerHTML = `<i class="fa-solid fa-pen-nib text-emerald-600"></i> Written by the Deuce Tennis team`;
            btnText.textContent = "Voir en Français";
            currentModalLang = 'en';
        } catch (err) {
            console.error("Erreur de traduction :", err);
            btnText.textContent = "Translate to EN";
            alert("Impossible de joindre le service de traduction en local. Réessaie après avoir rafraîchi ou déployé.");
        }
    } else {
        titleElem.textContent = originalFrenchTitle;
        contentElem.textContent = originalFrenchContent;
        document.getElementById('read-signature').innerHTML = `<i class="fa-solid fa-pen-nib text-emerald-600"></i> Rédigé par l'équipe Deuce Tennis`;
        btnText.textContent = "Translate to EN";
        currentModalLang = 'fr';
    }
}

function toggleReadModal(forceOpen = false) {
    const modal = document.getElementById('read-modal');
    if (!modal) return;
    if (forceOpen) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
        
        // Nettoie l'URL quand on ferme le modal pour revenir à l'accueil propre
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
}

// --- GESTION DE L'IMAGE CHOISIE ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    uploadedImageFile = file;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const placeholder = document.getElementById('upload-placeholder');
        if (preview && placeholder) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
}

// --- PUBLICATION DE L'ARTICLE SUR SUPABASE ---
async function generateArticleCode(event) {
    event.preventDefault();

    if (!isAdmin) {
        alert("Action non autorisée.");
        return;
    }

    const title = document.getElementById('article-title').value;
    const category = document.getElementById('article-category').value;
    const content = document.getElementById('article-content').value;

    if (!uploadedImageFile) {
        alert("Veuillez sélectionner une photo.");
        return;
    }

    try {
        const fileExt = uploadedImageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await _supabase.storage
            .from('article-images')
            .upload(fileName, uploadedImageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = _supabase.storage
            .from('article-images')
            .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;

        const newArticle = {
            title: title,
            category: category,
            content: content,
            image: imageUrl,
            date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        };

        const { error: insertError } = await _supabase
            .from('articles')
            .insert([newArticle]);

        if (insertError) throw insertError;

        document.getElementById('article-form').reset();
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.remove('hidden');
        uploadedImageFile = null;
        
        toggleAdminModal();
        loadArticles();
        alert("Génial ! Ton article a été publié directement sur Supabase et est maintenant en ligne !");
    } catch (err) {
        alert("Erreur lors de la publication : " + err.message);
    }
}

// --- SUPPRESSION D'UN ARTICLE ---
async function deleteArticle(id) {
    if (!isAdmin) return;

    if (confirm("Supprimer définitivement cet article ?")) {
        try {
            const { error } = await _supabase
                .from('articles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            loadArticles();
        } catch (err) {
            alert("Erreur lors de la suppression : " + err.message);
        }
    }
}

// --- NAVIGATION ET FILTRES (ONGLETS) ---
function navigateTo(page) {
    currentPage = page;
    showAllHomeArticles = false;

    const pages = ['home', 'atp', 'wta', 'itf'];
    pages.forEach(p => {
        const btn = document.getElementById(`nav-${p}`);
        if (btn) {
            if (p === page) {
                btn.className = "px-4 py-2 rounded-md bg-emerald-800 text-white transition";
            } else {
                btn.className = "px-4 py-2 rounded-md hover:bg-emerald-600 transition";
            }
        }
    });

    const headerElement = document.getElementById('main-header');
    const headerTitle = document.getElementById('header-title');
    const headerDesc = document.getElementById('header-desc');
    const sectionTitle = document.getElementById('section-title');

    if (!headerElement || !headerTitle || !headerDesc || !sectionTitle) return;

    if (page === 'home') {
        headerElement.className = "bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "DEUCE TENNIS";
        headerDesc.textContent = "L'actualité brûlante des circuits ATP, WTA et ITF";
        sectionTitle.textContent = "Tous les articles";
    } else if (page === 'atp') {
        headerElement.className = "bg-gradient-to-r from-blue-800 to-indigo-950 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "CIRCUIT ATP";
        headerDesc.textContent = "Analyses, résultats et portraits des stars du circuit masculin";
        sectionTitle.textContent = "Articles ATP";
    } else if (page === 'wta') {
        headerElement.className = "bg-gradient-to-r from-purple-800 to-fuchsia-950 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "CIRCUIT WTA";
        headerDesc.textContent = "Suivez la lutte pour le sommet du classement féminin mondial";
        sectionTitle.textContent = "Articles WTA";
    } else if (page === 'itf') {
        headerElement.className = "bg-gradient-to-r from-amber-700 to-orange-900 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "CIRCUIT ITF";
        headerDesc.textContent = "Aux racines du tennis mondial : les futurs cracks se forment ici";
        sectionTitle.textContent = "Articles ITF";
    }

    renderArticles();
}

// --- CONNEXION ADMINISTRATEUR ---
function handleAuthAction() {
    if (isAdmin) {
        isAdmin = false;
        localStorage.setItem('deuce_is_admin', JSON.stringify(false));
        applyAuthView();
        renderArticles();
        alert("Déconnecté de l'espace administrateur.");
    } else {
        toggleLoginModal();
    }
}

function toggleLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.toggle('hidden');
    const err = document.getElementById('login-error');
    if (err) err.classList.add('hidden');
    const passInput = document.getElementById('admin-password');
    if (passInput) passInput.value = "";
}

// Fermeture au clic en dehors du modal de lecture
document.addEventListener('click', function(e) {
    const readModal = document.getElementById('read-modal');
    if (readModal && !readModal.classList.contains('hidden') && e.target === readModal) {
        toggleReadModal(false);
    }
});

function loginAdmin(event) {
    event.preventDefault();
    const inputPass = document.getElementById('admin-password').value;
    
    if (inputPass === ADMIN_PASSWORD) {
        isAdmin = true;
        localStorage.setItem('deuce_is_admin', JSON.stringify(true));
        applyAuthView();
        toggleLoginModal();
        renderArticles();
    } else {
        const err = document.getElementById('login-error');
        if (err) err.classList.remove('hidden');
    }
}

function applyAuthView() {
    const btnWrite = document.getElementById('btn-write');
    const authText = document.getElementById('auth-text');
    const authIcon = document.getElementById('auth-icon');

    if (isAdmin) {
        if (btnWrite) btnWrite.classList.remove('hidden');
        if (authText) authText.textContent = "Déconnexion";
        if (authIcon) authIcon.className = "fa-solid fa-unlock-keyhole";
    } else {
        if (btnWrite) btnWrite.classList.add('hidden');
        if (authText) authText.textContent = "Admin";
        if (authIcon) authIcon.className = "fa-solid fa-lock";
    }
}

function toggleAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.toggle('hidden');
}

// --- DEMARRAGE DU SITE ---
window.onload = function() {
    applyAuthView();
    loadArticles();
    navigateTo('home');
};
