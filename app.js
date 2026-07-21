const SUPABASE_URL = "https://wywfqdlrlncvqvxznshm.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_PZ56ks1RrEOtoOw14hb2jg_-3zaZA3b"; 

// Initialisation du client Supabase
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let articles = []; 
let currentPage = 'home'; 
let isAdmin = JSON.parse(localStorage.getItem('deuce_is_admin')) || false;
let uploadedImageFile = null;
let showAllHomeArticles = false; // Permet de savoir si l'utilisateur a cliqué sur "Voir plus d'articles"

// --- FONCTION UTILITAIRE POUR CONVERTIR LE TITRE EN SLUG D'URL ---
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Supprime les accents
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-') // Remplace les espaces par des tirets
        .replace(/[^\w\-]+/g, '') // Supprime les caractères spéciaux
        .replace(/\-\-+/g, '-') // Évite les doubles tirets
        .replace(/^-+/, '') // Supprime le tiret au début
        .replace(/-+$/, ''); // Supprime le tiret à la fin
}

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
        
        // Vérification de l'URL au chargement de la page
        checkUrlForArticle();
    } catch (err) {
        console.error("Erreur lors de la récupération des articles Supabase :", err);
    }
}

// --- VERIFICATION DES PARAMETRES D'URL ---
function checkUrlForArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam && ['atp', 'wta', 'itf', 'about'].includes(pageParam)) {
        navigateTo(pageParam);
    }
    const articleSlug = urlParams.get('article');
    if (articleSlug) {
        const art = articles.find(a => slugify(a.title) === articleSlug);
        if (art) {
            setTimeout(() => {
                openArticle(art.id, false);
            }, 100);
        }
    }
}

// Gestion des boutons Retour/Avancer du navigateur
window.addEventListener('popstate', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const articleSlug = urlParams.get('article');
    if (articleSlug) {
        const art = articles.find(a => slugify(a.title) === articleSlug);
        if (art) openArticle(art.id, false);
    } else {
        const modal = document.getElementById('read-modal');
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    }
});

// --- RENDU DES CARTES D'ARTICLES ---
function renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    container.innerHTML = '';

    // Gestion du filtrage par onglet
    let filtered = currentPage === 'home' 
        ? articles 
        : articles.filter(art => art.category.toLowerCase() === currentPage);

    const totalFilteredCount = filtered.length;

    // --- LOGIQUE DE LIMITATION À 3 ARTICLES SUR L'ACCUEIL ---
    if (currentPage === 'home' && !showAllHomeArticles) {
        filtered = filtered.slice(0, 3); // Garde uniquement les 3 premiers (les plus récents)
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

    // Gestion de l'affichage du bouton "Voir plus"
    if (currentPage === 'home' && totalFilteredCount > 3 && !showAllHomeArticles) {
        createMoreButton();
    } else {
        removeMoreButton();
    }
}

// --- AJOUTER LE BOUTON "VOIR PLUS D'ARTICLES" ---
function createMoreButton() {
    let btn = document.getElementById('btn-load-more');
    if (btn) return; // Évite les doublons

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

    // Injection dynamique de la zone de signature
    let signatureElem = document.getElementById('read-signature');
    if (!signatureElem) {
        signatureElem = document.createElement('div');
        signatureElem.id = 'read-signature';
        signatureElem.className = "mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold italic flex items-center gap-1.5";
        document.getElementById('read-content').after(signatureElem);
    }
    signatureElem.innerHTML = `<i class="fa-solid fa-pen-nib text-emerald-600"></i> Rédigé par Deuce Tennis`;

    // --- GESTION DU BOUTON MODIFIER POUR L'ADMINISTRATEUR ---
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

    // Met à jour l'URL avec le titre de l'article formaté
    if (updateHistory) {
        const slug = slugify(art.title);
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?article=' + slug;
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

        alert("Modifications enregistrées avec succès !");
        
        // On recharge les données locales et on met à jour les éléments visuels
        await loadArticles(); 
    } catch (err) {
        alert("Erreur lors de la modification : " + err.message);
    }
}

function toggleReadModal(forceOpen = null) {
    const modal = document.getElementById('read-modal');
    if (!modal) return;

    if (forceOpen === true) {
        modal.classList.remove('hidden');
    } else if (forceOpen === false) {
        modal.classList.add('hidden');
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    } else {
        modal.classList.toggle('hidden');
        if (modal.classList.contains('hidden')) {
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: cleanUrl }, '', cleanUrl);
        }
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

// --- SUPPRESSION D'UN ARTICLE SUR SUPABASE ---
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

    const pages = ['home', 'atp', 'wta', 'itf', 'about'];
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

    const articlesContainer = document.getElementById('articles-container');
    const aboutContent = document.getElementById('about-content');
    const articleCount = document.getElementById('article-count');
    const isAbout = page === 'about';

    if (articlesContainer) articlesContainer.classList.toggle('hidden', isAbout);
    if (aboutContent) aboutContent.classList.toggle('hidden', !isAbout);
    if (articleCount) articleCount.classList.toggle('hidden', isAbout);

    if (page === 'about') {
        headerElement.className = "bg-gradient-to-r from-slate-700 to-slate-900 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "À PROPOS";
        headerDesc.textContent = "Qui sommes-nous ?";
        sectionTitle.textContent = "À propos de Deuce Actu";
        removeMoreButton();
        return;
    } else if (page === 'home') {
        headerElement.className = "bg-gradient-to-r from-emerald-800 to-teal-900 text-white py-12 text-center transition-all duration-300";
        headerTitle.textContent = "DEUCE ACTU";
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

// --- CONNEXION ADMINISTRATEUR MODIFIÉE ---
async function handleAuthAction() {
    if (isAdmin) {
        // Déconnexion propre de la session Supabase
        await _supabase.auth.signOut();
        isAdmin = false;
        localStorage.setItem('deuce_is_admin', JSON.stringify(false));
        applyAuthView();
        renderArticles();
        alert("Déconnecté de l'espace administrateur.");
    } else {
        toggleLoginModal();
    }
}

// Fermeture au clic en dehors du modal de lecture
document.addEventListener('click', function(e) {
    const readModal = document.getElementById('read-modal');
    if (readModal && !readModal.classList.contains('hidden') && e.target === readModal) {
        toggleReadModal(false);
    }
});

function toggleLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.toggle('hidden');
    const err = document.getElementById('login-error');
    if (err) err.classList.add('hidden');
    
    // Nettoyer les inputs
    const emailInput = document.getElementById('admin-email');
    const passInput = document.getElementById('admin-password');
    if (emailInput) emailInput.value = "";
    if (passInput) passInput.value = "";
}

async function loginAdmin(event) {
    event.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    // Utilisation de la méthode sécurisée de Supabase
    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (!error) {
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

// --- OUVERTURE/FERMETURE DES MODALS ---
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
// --- ENVOI D'UN MESSAGE DE CONTACT SUR SUPABASE ---
async function sendContactMessage(event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const message = document.getElementById('contact-message').value;

    try {
        const { error } = await _supabase
            .from('contacts')
            .insert([{ name, email, message }]);

        if (error) throw error;

        // Réinitialise le formulaire après succès
        document.getElementById('contact-form').reset();
        alert("Merci ! Votre message a bien été envoyé avec succès.");
    } catch (err) {
        alert("Erreur lors de l'envoi du message : " + err.message);
    }
}
