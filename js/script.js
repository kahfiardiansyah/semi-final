document.addEventListener('DOMContentLoaded', function () {

    const auth = firebase.auth();
    const db = firebase.firestore();
    const ADMIN_FEE_PERCENTAGE = 0.10; // Biaya admin 10%
    const path = window.location.pathname;

    // FUNGSI HELPER UNTUK FORMAT HARGA - TAMBAHKAN INI
    function formatPrice(price) {
        if (typeof price === 'number') {
            return 'Rp' + price.toLocaleString('id-ID');
        } else if (typeof price === 'string') {
            if (price.includes('Rp')) {
                return price; // Sudah diformat
            } else {
                const priceNumber = parseInt(price.replace(/[^0-9]/g, '')) || 0;
                return 'Rp' + priceNumber.toLocaleString('id-ID');
            }
        } else {
            return 'Rp0';
        }
    }

    function parsePrice(price) {
        if (typeof price === 'number') {
            return price;
        } else if (typeof price === 'string') {
            return parseInt(price.replace(/[^0-9]/g, '')) || 0;
        } else {
            return 0;
        }
    }

    // Hanya handle halaman yang tidak terkait chat
    if (path.includes('register.html') || path.endsWith('/') || path.includes('index.html')) {
        // Logika untuk halaman login
    } else if (path.includes('main.html')) {
        // Logika untuk halaman utama
    }
    // HAPUS inisialisasi inbox.html dan chat.html dari sini
    // Karena sudah ditangani oleh chat.js

    // FUNGSI BANTU UNTUK NOTIFIKASI TOAST
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // --- FUNGSI BARU UNTUK LOGIKA DISKON ---
    function getDiscount(duration) {
        if (duration >= 30) {
            return { percentage: 0.15, label: "Diskon 15% (Sewa 1 Bulan+)" }; // diskon 15%
        }
        if (duration >= 7) {
            return { percentage: 0.10, label: "Diskon 10% (Sewa 1 Minggu+)" }; // diskon 10%
        }
        return { percentage: 0, label: "" }; // tidak ada diskon
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN REGISTER & LOGIN
    // =========================================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const loginBox = document.getElementById('loginBox');
        const registerBox = document.getElementById('registerBox');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const registrationForm = document.getElementById('registrationForm');

        showRegister.addEventListener('click', (e) => { e.preventDefault(); loginBox.style.display = 'none'; registerBox.style.display = 'block'; });
        showLogin.addEventListener('click', (e) => { e.preventDefault(); registerBox.style.display = 'none'; loginBox.style.display = 'block'; });

        registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        role: 'user',
                        saved: []
                    }).then(() => {
                        Toast.fire({ icon: 'success', title: 'Registrasi berhasil! Silakan masuk.' });
                        registrationForm.reset();
                        registerBox.style.display = 'none';
                        loginBox.style.display = 'block';
                    });
                })
                .catch((error) => { Swal.fire({ icon: 'error', title: 'Oops...', text: error.message }); });
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists && doc.data().role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'main.html';
                        }
                    });
                })
                .catch((error) => {
                    Swal.fire({ icon: 'error', title: 'Login Gagal', text: error.message });
                });
        });
    }

    // =========================================================================
    // LOGIKA UNTUK MENU PROFIL
    // =========================================================================
    const userMenuItems = document.getElementById('user-menu-items');
    if (userMenuItems) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                userRef.get().then(doc => {
                    let menuHTML = '';
                    if (doc.exists) {
                        const userRole = doc.data().role;
                        if (userRole === 'admin') {
                            menuHTML = `
                                <li><a class="dropdown-item fw-bold" href="admin.html">Dashboard Admin</a></li>
                                <li><a class="dropdown-item" href="main.html">Lihat Website</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a></li>
                            `;
                        } else if (userRole === 'owner') {
                            menuHTML = `
                                <li><a class="dropdown-item" href="profile.html#profile-details">My Profile</a></li>
                                <li><a class="dropdown-item" href="inbox.html">Chat</a></li>
                                <li><a class="dropdown-item fw-bold" href="owner.html">Dashboard Owner</a></li>
                                <li><a class="dropdown-item" href="profile.html#saved">Saved</a></li>
                                <li><a class="dropdown-item" href="profile.html#history">History</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a></li>
                            `;
                        } else {
                            menuHTML = `
                                <li><a class="dropdown-item" href="profile.html#profile-details">My Profile</a></li>
                                <li><a class="dropdown-item" href="inbox.html">Chat</a></li>
                                <li><a class="dropdown-item" href="#" id="become-owner-btn">Sewakan Kantor Anda</a></li>
                                <li><a class="dropdown-item" href="profile.html#saved">Saved</a></li>
                                <li><a class="dropdown-item" href="profile.html#history">History</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a></li>
                            `;
                        }
                    }
                    userMenuItems.innerHTML = menuHTML;

                    const logoutButton = document.getElementById('logoutButton');
                    if (logoutButton) {
                        logoutButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            auth.signOut().then(() => { window.location.href = 'index.html'; });
                        });
                    }

                    const becomeOwnerBtn = document.getElementById('become-owner-btn');
                    if (becomeOwnerBtn) {
                        becomeOwnerBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            Swal.fire({
                                title: 'Apakah Anda yakin?',
                                text: "Anda akan menjadi pemilik dan bisa menyewakan properti.",
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                                confirmButtonText: 'Ya, saya yakin!'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    userRef.update({ role: 'owner' }).then(() => {
                                        Swal.fire('Selamat!', 'Anda sekarang adalah pemilik.', 'success')
                                            .then(() => window.location.reload());
                                    });
                                }
                            });
                        });
                    }
                });
            } else {
                userMenuItems.innerHTML = `
                    <li><a class="dropdown-item fw-bold" href="register.html">Log in</a></li>
                    <li><a class="dropdown-item" href="register.html">Sign up</a></li>
                `;
            }
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN UTAMA (main.html)
    // =========================================================================
    const experienceListContainer = document.getElementById('experience-list');
    if (experienceListContainer) {
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');
        const filterCity = document.getElementById('filter-city');
        const sortPrice = document.getElementById('sort-price');

        let allOffices = []; // Menyimpan semua data kantor
        let currentUserData = { saved: [] }; // Menyimpan data pengguna, termasuk daftar 'saved'

        // Fungsi untuk mengisi dropdown kota
        const populateCities = () => {
            const cities = [...new Set(allOffices.map(office => office.data.city))];
            filterCity.innerHTML = '<option value="">Semua Kota</option>';
            cities.sort().forEach(city => {
                if (city) {
                    filterCity.innerHTML += `<option value="${city}">${city}</option>`;
                }
            });
            filterCity.disabled = false;
        };

        // Fungsi untuk menangani klik save/unsave
        const handleSaveClick = (button) => {
            button.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                const user = auth.currentUser;
                if (!user) {
                    Toast.fire({ icon: 'warning', title: 'Anda harus login untuk menyimpan!' });
                    return;
                }

                const card = this.closest('.experience-card');
                const officeId = card.dataset.id;
                const userRef = db.collection('users').doc(user.uid);
                const heartIcon = this.querySelector('i');

                // Cek apakah sudah disimpan atau belum
                if (currentUserData.saved.includes(officeId)) {
                    // --- JIKA SUDAH, LAKUKAN UNSAVE ---
                    userRef.update({
                        saved: firebase.firestore.FieldValue.arrayRemove(officeId)
                    }).then(() => {
                        Toast.fire({ icon: 'info', title: 'Dihapus dari daftar tersimpan.' });
                        heartIcon.classList.remove('bi-heart-fill', 'text-danger');
                        heartIcon.classList.add('bi-heart');
                        // Update data lokal
                        currentUserData.saved = currentUserData.saved.filter(id => id !== officeId);
                    });
                } else {
                    // --- JIKA BELUM, LAKUKAN SAVE ---
                    userRef.update({
                        saved: firebase.firestore.FieldValue.arrayUnion(officeId)
                    }).then(() => {
                        Toast.fire({ icon: 'success', title: 'Kantor berhasil disimpan!' });
                        heartIcon.classList.remove('bi-heart');
                        heartIcon.classList.add('bi-heart-fill', 'text-danger');
                        // Update data lokal
                        currentUserData.saved.push(officeId);
                    });
                }
            });
        };

        // Fungsi utama untuk menampilkan kantor
        // Fungsi utama untuk menampilkan kantor
        const renderOffices = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedCity = filterCity.value;
            const sortBy = sortPrice.value;

            let filteredOffices = allOffices.filter(office => {
                const item = office.data; // PERBAIKAN: office.data BUKAN office.data()
                const matchesSearch = (item.title || '').toLowerCase().includes(searchTerm) ||
                    (item.city || '').toLowerCase().includes(searchTerm) ||
                    (item.location || '').toLowerCase().includes(searchTerm);
                const matchesCity = !selectedCity || item.city === selectedCity;
                return matchesSearch && matchesCity;
            });

            if (sortBy === 'termurah') {
                filteredOffices.sort((a, b) => {
                    const priceA = parsePrice(a.data.price || '0');
                    const priceB = parsePrice(b.data.price || '0');
                    return priceA - priceB;
                });
            } else if (sortBy === 'termahal') {
                filteredOffices.sort((a, b) => {
                    const priceA = parsePrice(a.data.price || '0');
                    const priceB = parsePrice(b.data.price || '0');
                    return priceB - priceA;
                });
            }

            experienceListContainer.innerHTML = '';
            if (filteredOffices.length === 0) {
                experienceListContainer.innerHTML = "<p class='mt-4 text-center'>Tidak ada kantor yang sesuai dengan kriteria Anda.</p>";
                return;
            }

            filteredOffices.forEach(office => {
                const doc = office.doc;
                const item = office.data; // PERBAIKAN: office.data BUKAN office.data()

                // PERBAIKAN: Gunakan fungsi formatPrice
                const formattedPrice = formatPrice(item.price);

                // Cek apakah kantor ini sudah di-save oleh user
                const isSaved = currentUserData.saved.includes(doc.id);
                const heartIconClass = isSaved ? 'bi-heart-fill text-danger' : 'bi-heart';

                let ratingHTML = '<span class="text-muted">Baru</span>';
                if (item.reviewCount > 0) {
                    const avgRating = (item.ratingSum / item.reviewCount).toFixed(1);
                    ratingHTML = `<i class="bi bi-star-fill text-danger"></i> ${avgRating} (${item.reviewCount} ulasan)`;
                }

                const saveButtonHTML = `<button class="btn btn-light btn-sm save-btn position-absolute top-0 end-0 m-2 rounded-circle"><i class="bi ${heartIconClass}"></i></button>`;
                const cardHTML = `
                    <div class="col-12 col-md-4 col-lg-3 mb-4">
                        <a href="details.html?id=${doc.id}" class="text-decoration-none text-dark">
                            <div class="card border-0 experience-card" data-id="${doc.id}">
                                <div class="position-relative">
                                    <img src="${item.image}" class="card-img-top rounded-3" alt="${item.title}">
                                    ${saveButtonHTML}
                                </div>
                                <div class="card-body px-0">
                                    <p class="card-text mb-1">${ratingHTML} · ${item.city || item.location}</p>
                                    <h6 class="card-title">${item.title || 'Tanpa Judul'}</h6>
                                    <p class="card-text">Mulai ${formattedPrice}</p>
                                </div>
                            </div>
                        </a>
                    </div>`;
                experienceListContainer.innerHTML += cardHTML;
            });

            // Setelah semua card ditampilkan, pasang event listener pada setiap tombol save
            document.querySelectorAll('.save-btn').forEach(handleSaveClick);
        };

        // Alur Utama: Muat data user dan kantor, lalu tampilkan
        // Alur Utama: Muat data user dan kantor, lalu tampilkan
        auth.onAuthStateChanged(user => {
            const officeQuery = db.collection('offices').get();

            if (user) {
                const userQuery = db.collection('users').doc(user.uid).get();
                Promise.all([officeQuery, userQuery]).then(([officeSnapshot, userDoc]) => {
                    // PERBAIKAN: Pastikan format data benar
                    allOffices = officeSnapshot.docs.map(doc => ({
                        doc: doc,
                        data: doc.data() // doc.data() BUKAN doc.data
                    }));
                    if (userDoc.exists) {
                        currentUserData = userDoc.data();
                    }
                    populateCities();
                    renderOffices();
                });
            } else {
                // Jika user tidak login
                officeQuery.then(officeSnapshot => {
                    allOffices = officeSnapshot.docs.map(doc => ({
                        doc: doc,
                        data: doc.data() // doc.data() BUKAN doc.data
                    }));
                    currentUserData = { saved: [] };
                    populateCities();
                    renderOffices();
                });
            }
        });
        // Pasang event listener untuk filter
        searchForm.addEventListener('submit', (e) => { e.preventDefault(); renderOffices(); });
        searchInput.addEventListener('input', renderOffices);
        filterCity.addEventListener('change', renderOffices);
        sortPrice.addEventListener('change', renderOffices);
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN DETAIL (details.html)
    // =========================================================================
    const detailsContent = document.getElementById('details-content');
    if (detailsContent) {
        const params = new URLSearchParams(window.location.search);
        const officeId = params.get('id');
        if (!officeId) {
            detailsContent.innerHTML = '<p>Kantor tidak ditemukan (ID tidak ada di URL).</p>';
        } else {
            // Fungsi helper untuk format harga
            function formatPrice(price) {
                if (typeof price === 'number') {
                    return 'Rp' + price.toLocaleString('id-ID');
                } else if (typeof price === 'string') {
                    return price; // Biarkan jika sudah diformat
                } else {
                    return 'Rp0';
                }
            }

            function parsePrice(price) {
                if (typeof price === 'number') {
                    return price;
                } else if (typeof price === 'string') {
                    return parseInt(price.replace(/[^0-9]/g, '')) || 0;
                } else {
                    return 0;
                }
            }

            const loadReviews = () => {
                const reviewsList = document.getElementById('reviews-list');
                if (!reviewsList) return;
                reviewsList.innerHTML = `<div class="text-center"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat ulasan...</p></div>`;
                db.collection('offices').doc(officeId).collection('reviews').orderBy('timestamp', 'desc').get().then(snapshot => {
                    if (snapshot.empty) {
                        reviewsList.innerHTML = '<p>Belum ada ulasan untuk kantor ini. Jadilah yang pertama!</p>';
                        return;
                    }
                    reviewsList.innerHTML = '';
                    snapshot.forEach(doc => {
                        const review = doc.data();
                        let starsHTML = '';
                        for (let i = 1; i <= 5; i++) {
                            starsHTML += `<i class="bi bi-star${i <= review.rating ? '-fill' : ''} text-warning"></i>`;
                        }
                        reviewsList.innerHTML += `
                            <div class="card mb-3">
                                <div class="card-body">
                                    <div class="d-flex w-100 justify-content-between">
                                        <h6 class="mb-1">${review.userName || 'Anonim'}</h6>
                                        <div>${starsHTML}</div>
                                    </div>
                                    <p class="mb-1">${review.comment}</p>
                                    <small class="text-muted">${new Date(review.timestamp?.toDate()).toLocaleDateString('id-ID')}</small>
                                </div>
                            </div>`;
                    });
                });
            };

            const handleStarRating = () => {
                const stars = document.querySelectorAll('#rating-input i');
                if (stars.length === 0) return;
                const ratingValueInput = document.getElementById('rating-value');
                let currentRating = 0;
                const setStars = (rating) => {
                    stars.forEach(star => {
                        if (parseInt(star.dataset.value) <= rating) {
                            star.classList.replace('bi-star', 'bi-star-fill');
                            star.classList.replace('text-secondary', 'text-warning');
                        } else {
                            star.classList.replace('bi-star-fill', 'bi-star');
                            star.classList.replace('text-warning', 'text-secondary');
                        }
                    });
                };
                stars.forEach(star => {
                    star.addEventListener('mouseover', () => setStars(parseInt(star.dataset.value)));
                    star.addEventListener('mouseleave', () => setStars(currentRating));
                    star.addEventListener('click', () => {
                        currentRating = parseInt(star.dataset.value);
                        ratingValueInput.value = currentRating;
                    });
                });
            };

            const loadDetails = async (user) => {
                try {
                    console.log('🔄 Loading details for office:', officeId);

                    const doc = await db.collection('offices').doc(officeId).get();
                    if (!doc.exists) {
                        detailsContent.innerHTML = '<p>Kantor tidak ditemukan.</p>';
                        return;
                    }

                    const item = doc.data();
                    console.log('📊 Office data:', item);
                    console.log('💰 Price value:', item.price, 'Type:', typeof item.price);

                    // PERBAIKAN: Handle price format dengan benar
                    let dailyPriceNumber = parsePrice(item.price);
                    const formattedPrice = formatPrice(item.price);

                    const isOwner = user && user.uid === item.ownerId;

                    let shareButtonHTML = '';
                    if (navigator.share) {
                        shareButtonHTML = `
                            <button id="share-btn" class="btn btn-outline-secondary ms-3">
                                <i class="bi bi-share-fill me-2"></i>Bagikan
                            </button>
                        `;
                    }

                    let bookedDates = [];
                    if (!isOwner) {
                        const bookingsSnapshot = await db.collection('bookings').where('id', '==', officeId).get();
                        bookingsSnapshot.forEach(bookingDoc => {
                            const bookingData = bookingDoc.data();
                            let start = new Date(bookingData.checkIn);
                            let end = new Date(bookingData.checkOut);
                            for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
                                bookedDates.push(new Date(dt));
                            }
                        });
                    }

                    let bookingSectionHTML = '';

                    if (isOwner) {
                        bookingSectionHTML = `
                            <hr>
                            <div class="alert alert-info text-center mt-3">
                                <i class="bi bi-info-circle-fill me-2"></i>Ini adalah properti Anda.
                            </div>
                            <button class="btn btn-secondary btn-lg w-100 mt-2" disabled>Tidak Dapat Memesan Properti Sendiri</button>
                        `;
                    } else {
                        bookingSectionHTML = `
                            <div class="mb-3">
                                <label for="checkin-date" class="form-label fw-bold">Pilih Tanggal</label>
                                <div class="input-group">
                                    <input type="text" id="checkin-date" class="form-control" placeholder="Pilih tanggal check-in & check-out">
                                </div>
                            </div>
                            
                            <!-- TOMBOL CHAT - akan dihandle oleh chat.js -->
                            <div class="mb-3">
                                <button type="button" class="btn btn-outline-danger w-100" id="chat-with-owner-btn">
                                    <i class="bi bi-chat-dots-fill me-2"></i>Chat dengan Pemilik
                                </button>
                            </div>
                            
                            <hr>
                            <div id="price-summary">
                                <div class="d-flex justify-content-between">
                                    <p id="price-calculation-text" class="mb-1 text-muted">Harga per hari</p>
                                    <p id="original-price" class="mb-1 text-muted">${formattedPrice}</p>
                                </div>
                                <div id="discount-details" class="d-flex justify-content-between text-success" style="display: none;">
                                    <p id="discount-label" class="mb-1">Diskon</p>
                                    <p id="discount-amount" class="mb-1">- Rp0</p>
                                </div>
                                <hr class="my-2">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="mb-0" id="total-price-label">Harga Total</h5>
                                        <small id="duration-label" class="text-muted">Untuk 1 hari</small>
                                    </div>
                                    <h4 id="total-price" data-daily-price="${dailyPriceNumber}">${formattedPrice}</h4>
                                </div>
                            </div>
                            <button class="btn btn-danger btn-lg w-100 mt-3" id="book-now-btn" disabled>Pilih Tanggal Dulu</button>
                        `;
                    }

                    detailsContent.innerHTML = `
                        <div class="col-md-7">
                            <div id="officeCarousel" class="carousel slide" data-bs-ride="carousel">
                                <div class="carousel-indicators" id="carousel-indicators"></div>
                                <div class="carousel-inner" id="carousel-inner-slides"></div>
                                <button class="carousel-control-prev" type="button" data-bs-target="#officeCarousel" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">Previous</span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#officeCarousel" data-bs-slide="next">
                                    <span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Next</span>
                                </button>
                            </div>
                        </div>
                        <div class="col-md-5">
                            <div class="d-flex justify-content-between align-items-start">
                                <h2 class="mb-0">${item.title || 'Tanpa Judul'}</h2>
                                ${shareButtonHTML}
                            </div>
                            <p class="text-muted d-flex align-items-center mt-1"><i class="bi bi-geo-alt-fill me-1"></i>${item.city || item.location}</p>
                            <p>${item.description}</p>
                            ${bookingSectionHTML}
                        </div>`;

                    // Setup tombol chat - akan dihandle oleh chat.js
                    const chatWithOwnerBtn = document.getElementById('chat-with-owner-btn');
                    if (chatWithOwnerBtn && !isOwner) {
                        // Event listener akan dihandle oleh chat.js
                        console.log('✅ Tombol chat siap, akan dihandle oleh chat.js');
                    }

                    const indicatorsContainer = document.getElementById('carousel-indicators');
                    const slidesContainer = document.getElementById('carousel-inner-slides');
                    indicatorsContainer.innerHTML = '';
                    slidesContainer.innerHTML = '';

                    if (item.images && Array.isArray(item.images)) {
                        item.images.forEach((imageUrl, index) => {
                            const activeClass = index === 0 ? 'active' : '';
                            indicatorsContainer.innerHTML += `
                                <button type="button" data-bs-target="#officeCarousel" data-bs-slide-to="${index}" class="${activeClass}" aria-current="true"></button>
                            `;
                            slidesContainer.innerHTML += `
                                <div class="carousel-item ${activeClass}">
                                    <img src="${imageUrl}" class="d-block w-100 rounded-3" alt="Foto Kantor ${index + 1}" style="height: 400px; object-fit: cover;">
                                </div>
                            `;
                        });
                    } else if (item.image) { // Fallback jika data lama hanya punya satu 'image'
                        slidesContainer.innerHTML += `
                            <div class="carousel-item active">
                                <img src="${item.image}" class="d-block w-100 rounded-3" alt="Foto Kantor" style="height: 400px; object-fit: cover;">
                            </div>
                        `;
                    }

                    const shareBtn = document.getElementById('share-btn');
                    if (shareBtn) {
                        shareBtn.addEventListener('click', async () => {
                            const shareData = {
                                title: `Sewa Kantor: ${item.title}`,
                                text: `Lihat kantor "${item.title}" di KerjaDi! Lokasi di ${item.city || item.location}.`,
                                url: window.location.href
                            };
                            try {
                                await navigator.share(shareData);
                            } catch (err) {
                                console.error('Error saat membagikan:', err);
                            }
                        });
                    }

                    if (!isOwner) {
                        const checkinInput = document.getElementById('checkin-date');
                        const bookNowBtn = document.getElementById('book-now-btn');
                        const totalPriceEl = document.getElementById('total-price');
                        const durationLabel = document.getElementById('duration-label');
                        const dailyPrice = parseInt(totalPriceEl.dataset.dailyPrice) || 0;

                        const discountDetails = document.getElementById('discount-details');
                        const discountLabel = document.getElementById('discount-label');
                        const discountAmountEl = document.getElementById('discount-amount');
                        const priceCalculationText = document.getElementById('price-calculation-text');
                        const originalPriceEl = document.getElementById('original-price');

                        let selectedDates = [];
                        let finalBookingDetails = {};

                        flatpickr(checkinInput, {
                            mode: "range", minDate: "today", dateFormat: "d M Y",
                            disable: bookedDates,
                            onClose: function (selectedDatesArr) {
                                if (selectedDatesArr.length === 2) {
                                    selectedDates = selectedDatesArr;
                                    const startTime = selectedDates[0].getTime();
                                    const endTime = selectedDates[1].getTime();
                                    const duration = Math.max(1, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));

                                    const discount = getDiscount(duration);
                                    const originalTotal = duration * dailyPrice;
                                    const discountAmount = originalTotal * discount.percentage;
                                    const finalTotal = originalTotal - discountAmount;

                                    // PERBAIKAN: Gunakan fungsi formatPrice yang konsisten
                                    if (discount.percentage > 0) {
                                        priceCalculationText.textContent = `${formatPrice(dailyPrice)} x ${duration} hari`;
                                        originalPriceEl.textContent = formatPrice(originalTotal);
                                        discountLabel.textContent = discount.label;
                                        discountAmountEl.textContent = `- ${formatPrice(discountAmount)}`;
                                        discountDetails.style.display = 'flex';
                                        originalPriceEl.style.textDecoration = 'line-through';
                                    } else {
                                        discountDetails.style.display = 'none';
                                        priceCalculationText.textContent = `Harga per hari`;
                                        originalPriceEl.textContent = formattedPrice;
                                        originalPriceEl.style.textDecoration = 'none';
                                    }

                                    totalPriceEl.textContent = formatPrice(finalTotal);
                                    durationLabel.textContent = `Untuk ${duration} hari`;
                                    bookNowBtn.disabled = false;
                                    bookNowBtn.textContent = 'Sewa Sekarang';

                                    finalBookingDetails = {
                                        checkIn: selectedDates[0].toISOString(),
                                        checkOut: selectedDates[1].toISOString(),
                                        duration: duration,
                                        subtotal: formatPrice(originalTotal),
                                        discount: `- ${formatPrice(discountAmount)}`,
                                        hasDiscount: discount.percentage > 0,
                                        totalPrice: formatPrice(finalTotal)
                                    };
                                }
                            }
                        });

                        bookNowBtn.addEventListener('click', function () {
                            if (!user) {
                                Toast.fire({ icon: 'warning', title: 'Anda harus login untuk memesan!' });
                                return;
                            }
                            if (selectedDates.length < 2) {
                                Toast.fire({ icon: 'warning', title: 'Harap pilih tanggal check-in dan check-out.' });
                                return;
                            }
                            const itemToBook = {
                                id: doc.id,
                                ...item,
                                ...finalBookingDetails,
                                ownerId: item.ownerId
                            };
                            localStorage.setItem('itemToBook', JSON.stringify(itemToBook));
                            window.location.href = 'payment.html';
                        });
                    }

                    if (typeof L !== 'undefined' && item.lat && item.lng) {
                        const map = L.map('map').setView([item.lat, item.lng], 16);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                        L.marker([item.lat, item.lng]).addTo(map).bindPopup(`<b>${item.title}</b>`).openPopup();
                        const gmapsBtn = document.getElementById('gmaps-direction-btn');
                        if (gmapsBtn) {
                            gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
                        }
                    }
                    const reviewFormContainer = document.getElementById('review-form-container');
                    if (reviewFormContainer) {
                        if (isOwner || !user) {
                            reviewFormContainer.style.display = 'none';
                        }
                    }
                    loadReviews();
                    handleStarRating();
                } catch (error) {
                    console.error("Error loading details:", error);
                    detailsContent.innerHTML = '<p>Terjadi error saat memuat data.</p>';
                }
            };

            const addReviewForm = document.getElementById('add-review-form');
            if (addReviewForm) {
                addReviewForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const user = auth.currentUser;
                    if (!user) {
                        Toast.fire({ icon: 'warning', title: 'Anda harus login untuk memberi ulasan!' });
                        return;
                    }
                    const rating = parseInt(document.getElementById('rating-value').value);
                    const comment = document.getElementById('review-text').value;
                    if (!rating || rating === 0) {
                        Toast.fire({ icon: 'error', title: 'Harap berikan rating bintang.' });
                        return;
                    }
                    db.collection('users').doc(user.uid).get().then(userDoc => {
                        const userName = userDoc.data().name;
                        const officeRef = db.collection('offices').doc(officeId);
                        const reviewRef = officeRef.collection('reviews').doc();
                        db.runTransaction((transaction) => {
                            return transaction.get(officeRef).then((officeDoc) => {
                                if (!officeDoc.exists) {
                                    throw "Dokumen kantor tidak ditemukan!";
                                }
                                const newReviewCount = (officeDoc.data().reviewCount || 0) + 1;
                                const newRatingSum = (officeDoc.data().ratingSum || 0) + rating;
                                transaction.update(officeRef, {
                                    reviewCount: newReviewCount,
                                    ratingSum: newRatingSum
                                });
                                transaction.set(reviewRef, {
                                    userId: user.uid,
                                    userName: userName,
                                    rating: rating,
                                    comment: comment,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            });
                        }).then(() => {
                            Toast.fire({ icon: 'success', title: 'Ulasan Anda berhasil dikirim!' });
                            addReviewForm.reset();
                            document.getElementById('rating-value').value = '0';
                            document.querySelectorAll('#rating-input i').forEach(star => {
                                star.classList.replace('bi-star-fill', 'bi-star');
                                star.classList.replace('text-warning', 'text-secondary');
                            });
                            loadReviews();
                        }).catch((error) => {
                            console.error("Gagal mengirim ulasan: ", error);
                            Swal.fire('Error', 'Gagal mengirim ulasan.', 'error');
                        });
                    });
                });
            }

            auth.onAuthStateChanged(user => { loadDetails(user); });
        }
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN PROFIL
    // =========================================================================

    const profileTabContent = document.getElementById('profileTabContent');
    if (profileTabContent) {

        auth.onAuthStateChanged(user => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);

                // 1. AMBIL DATA PENGGUNA SATU KALI
                userRef.get().then(doc => {
                    if (!doc.exists) return;

                    const userData = doc.data();

                    // 2. TAMPILKAN SEMUA DATA PROFIL
                    displayProfileData(userData);
                    displaySavedItems(userData);
                    displayHistory(user.uid); // History butuh uid
                });

                // Fungsi untuk menampilkan info profil dasar & bank
                const displayProfileData = (userData) => {
                    const profileDetailsContainer = document.getElementById('profile-details');
                    if (!profileDetailsContainer) return;

                    // Tampilkan info dasar
                    document.getElementById('profile-name').textContent = userData.name;
                    document.getElementById('profile-email').textContent = userData.email;
                    if (userData.photoURL) {
                        document.getElementById('profile-picture').src = userData.photoURL;
                    }
                    document.getElementById('edit-name').value = userData.name;

                    // Tampilkan info bank HANYA JIKA owner
                    if (userData.role === 'owner') {
                        if (userData.bankInfo && userData.bankInfo.bankName) {
                            const bankDisplayHTML = `
                            <hr class="my-4"><h5 class="text-start">Informasi Rekening Bank</h5>
                            <div class="card bg-light border-0 text-start">
                                <div class="card-body">
                                    <p class="text-muted mb-0">Nama Bank</p><h5 class="mb-3"><i class="bi bi-bank me-2"></i>${userData.bankInfo.bankName}</h5>
                                    <p class="text-muted mb-0">Nomor Rekening</p><h5 class="mb-3">${userData.bankInfo.accountNumber}</h5>
                                    <p class="text-muted mb-0">Atas Nama</p><h5 class="mb-0">${userData.bankInfo.accountHolder}</h5>
                                </div>
                            </div>`;
                            profileDetailsContainer.innerHTML += bankDisplayHTML;
                        } else {
                            const bankFormHTML = `
                            <hr class="my-4"><h5 class="text-start">Lengkapi Informasi Rekening Bank</h5>
                            <div class="card text-start">
                                <div class="card-body">
                                    <p class="card-text text-muted">Lengkapi informasi rekening untuk menerima pembayaran.</p>
                                    <form id="bank-details-form">
                                        <div class="mb-3"><label for="bank-name" class="form-label">Nama Bank</label><input type="text" id="bank-name" class="form-control" required></div>
                                        <div class="mb-3"><label for="account-holder" class="form-label">Nama Pemilik Rekening</label><input type="text" id="account-holder" class="form-control" required></div>
                                        <div class="mb-3"><label for="account-number" class="form-label">Nomor Rekening</label><input type="number" id="account-number" class="form-control" required></div>
                                        <button type="submit" class="btn btn-primary">Simpan Informasi</button>
                                    </form>
                                </div>
                            </div>`;
                            profileDetailsContainer.innerHTML += bankFormHTML;

                            document.getElementById('bank-details-form').addEventListener('submit', (e) => {
                                e.preventDefault();
                                const bankInfo = {
                                    bankName: document.getElementById('bank-name').value,
                                    accountHolder: document.getElementById('account-holder').value,
                                    accountNumber: document.getElementById('account-number').value
                                };
                                userRef.update({ bankInfo: bankInfo }).then(() => location.reload());
                            });
                        }
                    }
                };

                // Fungsi untuk menampilkan item tersimpan
                const displaySavedItems = (userData) => {
                    const savedItemsContainer = document.getElementById('saved-items-container');
                    if (!savedItemsContainer) return;

                    if (userData.saved && userData.saved.length > 0) {
                        savedItemsContainer.innerHTML = '';
                        userData.saved.forEach(officeId => {
                            db.collection('offices').doc(officeId).get().then(officeDoc => {
                                if (officeDoc.exists) {
                                    const item = officeDoc.data();
                                    savedItemsContainer.innerHTML += `
                                        <div class="col-12 col-md-6 col-lg-3">
                                            <a href="details.html?id=${officeId}" class="text-decoration-none text-dark">
                                                <div class="card border-0">
                                                    <img src="${item.image}" class="card-img-top rounded-3" alt="${item.title}">
                                                    <div class="card-body px-0">
                                                        <p class="card-text mb-1"><i class="bi bi-geo-alt-fill"></i> ${item.city}</p>
                                                        <h6 class="card-title">${item.title}</h6>
                                                        <p class="card-text">${item.price}</p>
                                                    </div>
                                                </div>
                                            </a>
                                        </div>`;
                                }
                            });
                        });
                    } else {
                        savedItemsContainer.innerHTML = '<p>Anda belum menyimpan kantor apa pun.</p>';
                    }
                };

                // Fungsi untuk menampilkan riwayat
                const displayHistory = (userId) => {
                    const historyContainer = document.getElementById('history-list-container');
                    if (!historyContainer) return;

                    db.collection('bookings').where('userId', '==', userId).orderBy('bookingTimestamp', 'desc').get().then(querySnapshot => {
                        if (querySnapshot.empty) {
                            historyContainer.innerHTML = '<p>Tidak ada riwayat penyewaan.</p>';
                            return;
                        }
                        historyContainer.innerHTML = '<div class="list-group"></div>';
                        const historyListGroup = historyContainer.querySelector('.list-group');
                        querySnapshot.forEach(doc => {
                            const item = doc.data();
                            const checkInDate = new Date(item.checkIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                            const checkOutDate = new Date(item.checkOut).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                            const formattedDateRange = `${checkInDate} - ${checkOutDate}`;
                            historyListGroup.innerHTML += `
                            <a href="receipt.html?bookingId=${doc.id}" class="list-group-item list-group-item-action">
                                <div class="d-flex w-100 justify-content-between">
                                    <h5 class="mb-1">${item.title}</h5><small>${formattedDateRange}</small>
                                </div>
                                <p class="mb-1">${item.location || item.city} - ${item.totalPrice}</p>
                            </a>`;
                        });
                    });
                };

                // Logika untuk form edit profil
                const editProfileForm = document.getElementById('edit-profile-form');
                if (editProfileForm) {
                    editProfileForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const newName = document.getElementById('edit-name').value;
                        const newPictureFile = document.getElementById('edit-picture').files[0];
                        const saveButton = editProfileForm.querySelector('button[type="submit"]');
                        saveButton.disabled = true;
                        saveButton.textContent = 'Menyimpan...';

                        if (newPictureFile) {
                            const apiKey = '5e43898d4fb8147933d7b891113c23fc';
                            const formData = new FormData();
                            formData.append('image', newPictureFile);
                            fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData })
                                .then(response => response.json())
                                .then(result => {
                                    if (result.success) {
                                        userRef.update({ name: newName, photoURL: result.data.url }).then(() => location.reload());
                                    } else {
                                        saveButton.disabled = false;
                                        saveButton.textContent = 'Simpan Perubahan';
                                        Swal.fire('Gagal', 'Gagal mengupload gambar.', 'error');
                                    }
                                })
                                .catch(error => {
                                    saveButton.disabled = false;
                                    saveButton.textContent = 'Simpan Perubahan';
                                    Swal.fire('Gagal', 'Terjadi kesalahan jaringan.', 'error');
                                });
                        } else {
                            userRef.update({ name: newName }).then(() => location.reload());
                        }
                    });
                }

            } else {
                window.location.href = 'register.html';
            }
        });

        // Logika untuk mengaktifkan tab dari URL
        const hash = window.location.hash;
        if (hash) {
            const tabToActivate = document.querySelector(`.nav-tabs button[data-bs-target="${hash}"]`);
            if (tabToActivate) { new bootstrap.Tab(tabToActivate).show(); }
        }
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN PEMBAYARAN (payment.html)
    // =========================================================================
    const paymentPageContainer = document.getElementById('payment-page-container');
    if (paymentPageContainer) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                let userData = {};

                userRef.get().then(doc => {
                    if (doc.exists) {
                        userData = doc.data();
                        document.getElementById('renter-name').value = userData.name;
                        document.getElementById('renter-email').value = user.email;
                    }
                });

                const itemToBook = JSON.parse(localStorage.getItem('itemToBook'));
                if (!itemToBook) {
                    window.location.href = 'main.html';
                    return;
                }

                document.getElementById('summary-image').src = itemToBook.image;
                document.getElementById('summary-title').textContent = itemToBook.title;
                document.getElementById('summary-location').textContent = itemToBook.location || itemToBook.city;

                const checkInDate = new Date(itemToBook.checkIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const checkOutDate = new Date(itemToBook.checkOut).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                document.getElementById('summary-checkin').textContent = checkInDate;
                document.getElementById('summary-checkout').textContent = checkOutDate;
                document.getElementById('summary-duration').textContent = `${itemToBook.duration} hari`;

                document.getElementById('rental-subtotal').textContent = itemToBook.subtotal;
                if (itemToBook.hasDiscount) {
                    document.getElementById('discount-row').style.display = 'flex';
                    document.getElementById('rental-discount').textContent = itemToBook.discount;
                }
                document.getElementById('total-price').textContent = itemToBook.totalPrice;

                document.getElementById('pay-now-btn').addEventListener('click', function () {
                    const payButton = this;
                    payButton.disabled = true;
                    payButton.textContent = 'Memproses...';

                    const phoneNumber = document.getElementById('renter-phone').value;
                    if (!phoneNumber) {
                        Toast.fire({ icon: 'warning', title: 'Harap masukkan nomor telepon Anda.' });
                        payButton.disabled = false;
                        payButton.textContent = 'Lakukan Pembayaran';
                        return;
                    }

                    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
                    const selectedPaymentId = selectedPayment ? selectedPayment.id : 'payment-va';
                    const selectedPaymentValue = selectedPayment ? selectedPayment.value : 'Virtual Account';

                    const vaNumber = '8808' + Math.floor(1000000000 + Math.random() * 9000000000);
                    const orderDetailsText = `Order ID: ORDER-${new Date().getTime()}\nAmount: ${itemToBook.totalPrice}`;
                    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(orderDetailsText)}`;

                    let popupTitle = 'Selesaikan Pembayaran';
                    let popupHtml = '';

                    if (selectedPaymentId === 'payment-va') {
                        popupTitle = 'Pembayaran Virtual Account';
                        popupHtml = `
                            <p>Silakan transfer ke nomor Virtual Account di bawah ini.</p>
                            <div class="text-start p-3 bg-light rounded">
                                <p class="mb-1"><strong>Bank Tujuan</strong></p>
                                <p>Bank Mandiri (Contoh)</p>
                                <p class="mb-1"><strong>Nomor Virtual Account</strong></p>
                                <h4 class="text-primary user-select-all">${vaNumber}</h4>
                                <hr>
                                <p class="mb-1"><strong>Total Pembayaran</strong></p>
                                <h3><strong>${itemToBook.totalPrice}</strong></h3>
                            </div>
                            <small class="text-muted mt-3 d-block">Ini adalah simulasi. Klik "Saya Sudah Bayar" untuk melanjutkan.</small>
                        `;
                    } else if (selectedPaymentId === 'payment-qris') {
                        popupTitle = 'Pembayaran QRIS';
                        popupHtml = `
                            <p>Silakan pindai (scan) kode QR di bawah ini menggunakan aplikasi e-wallet Anda.</p>
                            <img src="${qrImageUrl}" alt="QR Code Fiktif" class="mx-auto d-block my-3 border rounded">
                            <hr>
                            <div class="d-flex justify-content-between">
                                <span>Total Pembayaran:</span>
                                <strong>${itemToBook.totalPrice}</strong>
                            </div>
                            <small class="text-muted mt-3 d-block">Ini adalah simulasi. Klik "Saya Sudah Bayar" untuk melanjutkan.</small>
                        `;
                    } else {
                        popupTitle = 'Selesaikan Pembayaran';
                        popupHtml = `
                            <p>Silakan selesaikan pembayaran Anda melalui salah satu metode di bawah ini.</p>
                            <div class="text-start">
                                <hr>
                                <p class="mb-2"><strong>Virtual Account</strong></p>
                                <p>Bank Tujuan: Mandiri</p>
                                <h4 class="text-primary user-select-all">${vaNumber}</h4>
                                <hr>
                                <p class="mb-2"><strong>Scan QRIS</strong></p>
                                <img src="${qrImageUrl}" alt="QR Code Fiktif" class="mx-auto d-block border rounded">
                                <hr>
                                <p>Total Pembayaran:</p>
                                <h3><strong>${itemToBook.totalPrice}</strong></h3>
                            </div>
                            <small class="text-muted mt-3 d-block">Ini adalah simulasi. Klik "Saya Sudah Bayar" untuk melanjutkan.</small>
                        `;
                    }

                    Swal.fire({
                        title: popupTitle,
                        html: popupHtml,
                        icon: 'info',
                        confirmButtonText: 'Saya Sudah Bayar',
                        showCancelButton: true,
                        cancelButtonText: 'Batal'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const grossAmount = parseInt(itemToBook.totalPrice.replace(/[^0-9]/g, '')) || 0;
                            const calculatedAdminFee = grossAmount * ADMIN_FEE_PERCENTAGE;
                            const netForOwner = grossAmount - calculatedAdminFee;

                            const bookingData = {
                                ...itemToBook,
                                userId: user.uid,
                                bookingDate: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
                                bookingTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                renterPhone: phoneNumber,
                                paymentMethod: selectedPaymentValue + ' (Simulasi)',
                                virtualAccount: selectedPaymentId === 'payment-va' ? vaNumber : 'N/A',
                                subtotal: 'Rp' + netForOwner.toLocaleString('id-ID'),
                                adminFee: 'Rp' + calculatedAdminFee.toLocaleString('id-ID'),
                                totalPrice: 'Rp' + grossAmount.toLocaleString('id-ID')
                            };

                            db.collection('bookings').add(bookingData).then((docRef) => {
                                const bookingId = docRef.id;
                                const renterName = userData.name || 'Penyewa';

                                const checkInDate = new Date(bookingData.checkIn).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' });
                                const checkOutDate = new Date(bookingData.checkOut).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });

                                const pesanOtomatis = `Halo ${renterName}, terima kasih telah memesan ${bookingData.title}! ` +
                                    `Saya sudah menerima pesanan Anda untuk tanggal ${checkInDate} - ${checkOutDate}. ` +
                                    `Jika ada pertanyaan, jangan ragu untuk bertanya di sini ya. Sampai jumpa!`;

                                const messagePayload = {
                                    text: pesanOtomatis,
                                    senderId: bookingData.ownerId,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                                };

                                // Pesan otomatis akan dihandle oleh chat.js
                                console.log('✅ Pesan otomatis siap, akan dihandle oleh chat.js');

                                Swal.fire('Berhasil!', 'Pembayaran Anda telah dikonfirmasi.', 'success')
                                    .then(() => {
                                        localStorage.removeItem('itemToBook');
                                        window.location.href = `receipt.html?bookingId=${bookingId}`;
                                    });

                            }).catch(error => {
                                console.error("Error adding booking: ", error);
                                Swal.fire('Gagal', 'Gagal menyimpan pesanan. Coba lagi.', 'error');
                            });
                        } else {
                            payButton.disabled = false;
                            payButton.textContent = 'Lakukan Pembayaran';
                        }
                    });
                });
            } else {
                window.location.href = 'register.html';
            }
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN BUKTI PEMBAYARAN (receipt.html)
    // =========================================================================
    const receiptContainer = document.getElementById('receipt-container');
    if (receiptContainer) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const params = new URLSearchParams(window.location.search);
                const bookingId = params.get('bookingId');
                if (!bookingId) {
                    receiptContainer.innerHTML = '<p class="p-4 text-center">ID Pemesanan tidak ditemukan.</p>';
                    return;
                }

                db.collection('bookings').doc(bookingId).get().then(doc => {
                    if (doc.exists && (doc.data().userId === user.uid || doc.data().ownerId === user.uid)) {
                        const booking = doc.data();
                        db.collection('users').doc(booking.userId).get().then(userDoc => {
                            const userData = userDoc.data();

                            const checkInDate = new Date(booking.checkIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                            const checkOutDate = new Date(booking.checkOut).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

                            receiptContainer.innerHTML = `
                            <div class="card-header bg-success text-white text-center py-4">
                                <h4 class="mb-0"><i class="bi bi-check-circle-fill me-2"></i>Pembayaran Berhasil</h4>
                                <p class="mb-0">ID Sewa: #${doc.id}</p>
                            </div>
                            <div class="card-body p-4">
                                <p class="lead">Terima kasih, ${userData.name}. Pesanan Anda telah dikonfirmasi.</p>
                                <hr>
                                
                                <h5 class="mb-3">Detail Sewa</h5>
                                <div class="row mb-4">
                                    <div class="col-md-4 mb-3 mb-md-0">
                                        <img src="${booking.image}" class="img-fluid rounded-3" alt="${booking.title}">
                                    </div>
                                    <div class="col-md-8">
                                        <p><strong>Produk:</strong> ${booking.title}</p>
                                        <p><strong>Lokasi:</strong> ${booking.location || booking.city}</p>
                                        <p><strong>Check-in:</strong> ${checkInDate}</p>
                                        <p><strong>Check-out:</strong> ${checkOutDate}</p>
                                        <p><strong>Durasi:</strong> ${booking.duration} hari</p>
                                    </div>
                                </div>

                                <h5 class="mb-3">Rincian Pembayaran</h5>
                                <ul class="list-group list-group-flush">
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span>Subtotal</span>
                                        <span>${booking.subtotal || booking.price}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between">
                                        <span>Biaya Layanan</span>
                                        <span>${booking.adminFee || 'Rp0'}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between fw-bold h5">
                                        <span>Total Pembayaran</span>
                                        <span>${booking.totalPrice}</span>
                                    </li>
                                </ul>

                                <hr class="my-4">
                                <div class="text-center text-muted">
                                    <small>Dibayar pada ${booking.bookingDate} melalui ${booking.paymentMethod}</small>
                                </div>
                            </div>`;

                            // Tombol contact owner akan dihandle oleh chat.js
                            const contactBtn = document.getElementById('contact-owner-btn');
                            if (contactBtn && booking.ownerId) {
                                console.log('✅ Tombol contact owner siap, akan dihandle oleh chat.js');
                            }

                            const downloadBtn = document.getElementById('download-pdf-btn');
                            if (downloadBtn) {
                                downloadBtn.addEventListener('click', () => {
                                    downloadBtn.disabled = true;
                                    downloadBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengunduh...`;

                                    const invoiceElement = document.getElementById('receipt-container');

                                    const options = {
                                        margin: [0.5, 0.5, 0.5, 0.5],
                                        filename: `invoice-KerjaDi-${bookingId}.pdf`,
                                        image: { type: 'jpeg', quality: 0.98 },
                                        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
                                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                                    };

                                    html2pdf().from(invoiceElement).set(options).save().then(() => {
                                        downloadBtn.disabled = false;
                                        downloadBtn.innerHTML = `<i class="bi bi-download me-2"></i>Download PDF`;
                                    });
                                });
                            }
                        });
                    } else {
                        receiptContainer.innerHTML = '<p class="p-4 text-center">Detail pemesanan tidak ditemukan atau Anda tidak memiliki akses.</p>';
                    }
                }).catch(error => {
                    console.error("Error getting receipt:", error);
                    receiptContainer.innerHTML = '<p class="p-4 text-center">Terjadi kesalahan saat memuat data.</p>';
                });
            } else {
                window.location.href = 'register.html';
            }
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN PEMILIK (owner.html)
    // =========================================================================
    const addOfficeForm = document.getElementById('add-office-form');
    // SALIN DAN TAMBAHKAN KODE BLOK INI KE script.js ANDA

    const ownerBookingsList = document.getElementById('owner-bookings-history');

    if (ownerBookingsList) {
        ownerBookingsList.addEventListener('click', function (event) {
            // Cari elemen terdekat yang merupakan link penyewa
            const renterLink = event.target.closest('.contact-renter-link');

            if (renterLink) {
                event.preventDefault(); // Mencegah link berpindah halaman
                const renterId = renterLink.dataset.renterId;

                if (renterId) {
                    console.log('Mencoba memulai chat dengan penyewa ID:', renterId);
                    getOrCreateChat(renterId); // Memanggil fungsi chat global!
                } else {
                    console.error('ID Penyewa tidak ditemukan di elemen!');
                    alert('Gagal memulai chat: ID penyewa tidak ada.');
                }
            }
        });
    }
    if (addOfficeForm) {
        const ownerBookingsList = document.getElementById('owner-bookings-history');

        function loadOwnerDashboardStats(ownerId) {
            const bookingsRef = db.collection('bookings').where('ownerId', '==', ownerId);

            const totalBookingsEl = document.getElementById('total-owner-bookings');
            const totalGrossRevenueEl = document.getElementById('total-gross-revenue');
            const totalAdminFeeEl = document.getElementById('total-admin-fee');
            const totalNetRevenueEl = document.getElementById('total-net-revenue');

            if (totalBookingsEl) totalBookingsEl.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
            if (totalGrossRevenueEl) totalGrossRevenueEl.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
            if (totalAdminFeeEl) totalAdminFeeEl.innerHTML = `<div class="spinner-border spinner-border-sm text-danger" role="status"></div>`;
            if (totalNetRevenueEl) totalNetRevenueEl.innerHTML = `<div class="spinner-border spinner-border-sm text-success" role="status"></div>`;

            bookingsRef.get().then(querySnapshot => {
                const totalBookings = querySnapshot.size;
                let totalRevenue = 0;

                querySnapshot.forEach(doc => {
                    const booking = doc.data();
                    const priceString = booking.totalPrice || booking.price || '0';
                    const priceNumber = parseInt(priceString.replace(/[^0-9]/g, '')) || 0;
                    totalRevenue += priceNumber;
                });

                const adminFee = totalRevenue * ADMIN_FEE_PERCENTAGE;
                const netRevenue = totalRevenue - adminFee;

                if (totalBookingsEl) totalBookingsEl.textContent = totalBookings;
                if (totalGrossRevenueEl) totalGrossRevenueEl.textContent = 'Rp' + totalRevenue.toLocaleString('id-ID');
                if (totalAdminFeeEl) totalAdminFeeEl.textContent = '- Rp' + adminFee.toLocaleString('id-ID');
                if (totalNetRevenueEl) totalNetRevenueEl.textContent = 'Rp' + netRevenue.toLocaleString('id-ID');

            }).catch(error => {
                console.error("Error loading owner stats:", error);
                if (totalBookingsEl) totalBookingsEl.textContent = 'Error';
                if (totalGrossRevenueEl) totalGrossRevenueEl.textContent = 'Error';
                if (totalAdminFeeEl) totalAdminFeeEl.textContent = 'Error';
                if (totalNetRevenueEl) totalNetRevenueEl.textContent = 'Error';
            });
        }

        const mapContainer = document.getElementById('add-map');
        let map = null;
        let marker = null;
        if (mapContainer) {
            const defaultCoords = [-6.2088, 106.8456]; // Jakarta
            map = L.map('add-map').setView(defaultCoords, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            marker = L.marker(defaultCoords, { draggable: true }).addTo(map);

            marker.on('dragend', function (e) {
                const latlng = e.target.getLatLng();
                document.getElementById('latitude').value = latlng.lat;
                document.getElementById('longitude').value = latlng.lng;
            });

            document.getElementById('latitude').value = defaultCoords[0];
            document.getElementById('longitude').value = defaultCoords[1];
        }

        const searchAddressBtn = document.getElementById('search-address-btn');
        if (searchAddressBtn) {
            searchAddressBtn.addEventListener('click', () => {
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const query = `${address}, ${city}`;

                if (!address && !city) {
                    Toast.fire({ icon: 'warning', title: 'Isi alamat atau kota terlebih dahulu!' });
                    return;
                }

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const lat = data[0].lat;
                            const lon = data[0].lon;
                            const newLatLng = new L.LatLng(lat, lon);
                            map.setView(newLatLng, 16);
                            marker.setLatLng(newLatLng);
                            document.getElementById('latitude').value = lat;
                            document.getElementById('longitude').value = lon;
                        } else {
                            Toast.fire({ icon: 'error', title: 'Alamat tidak ditemukan.' });
                        }
                    })
                    .catch(error => {
                        console.error('Error geocoding:', error);
                        Swal.fire('Error', 'Gagal mencari alamat.', 'error');
                    });
            });
        }

        // GANTI FUNGSI LAMA ANDA DENGAN YANG INI

        const loadOwnerBookings = (ownerId) => {
            const ownerBookingsList = document.getElementById('owner-bookings-history');
            if (!ownerBookingsList) return;

            ownerBookingsList.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat pesanan...</p></div>`;

            db.collection('bookings').where('ownerId', '==', ownerId).orderBy('bookingTimestamp', 'desc').get().then(async (querySnapshot) => {
                if (querySnapshot.empty) {
                    ownerBookingsList.innerHTML = '<p class="text-muted text-center mt-4">Belum ada pesanan yang masuk.</p>';
                    return;
                }

                let bookingsHtml = '';
                for (const doc of querySnapshot.docs) {
                    const booking = doc.data();
                    const bookingId = doc.id;
                    let renterName = 'Nama Tidak Ditemukan';

                    // Ambil nama penyewa
                    try {
                        const userDoc = await db.collection('users').doc(booking.userId).get();
                        if (userDoc.exists) {
                            renterName = userDoc.data().name;
                        }
                    } catch (e) {
                        console.error("Gagal mengambil data penyewa:", e);
                    }

                    // Format tanggal
                    const checkInDate = new Date(booking.checkIn).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                    const checkOutDate = new Date(booking.checkOut).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                    bookingsHtml += `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${booking.title}</h6>
                            <p class="mb-1"><strong>Penyewa:</strong> ${renterName}</p>
                            <p class="mb-1"><strong>Tanggal:</strong> ${checkInDate} - ${checkOutDate}</p>
                            <p class="mb-1"><strong>Durasi:</strong> ${booking.duration} hari</p>
                            <p class="mb-1"><strong>Total:</strong> ${booking.totalPrice}</p>
                            <p class="mb-1"><strong>Status:</strong> <span class="badge bg-success">Dibayar</span></p>
                            <small class="text-muted">ID Pesanan: ${bookingId}</small>
                        </div>
                        <div class="d-flex flex-column gap-2">
                            <a href="owner-booking-detail.html?bookingId=${bookingId}" class="btn btn-info btn-sm">
                                <i class="bi bi-eye-fill me-1"></i>Detail
                            </a>
                            <button class="btn btn-primary btn-sm contact-renter-link" data-renter-id="${booking.userId}">
                                <i class="bi bi-chat-dots-fill me-1"></i>Chat
                            </button>
                        </div>
                    </div>
                </div>
            `;
                }

                ownerBookingsList.innerHTML = bookingsHtml;

                // Event listener untuk tombol chat
                document.querySelectorAll('.contact-renter-link').forEach(button => {
                    button.addEventListener('click', function () {
                        const renterId = this.dataset.renterId;
                        if (renterId && typeof getOrCreateChat === 'function') {
                            getOrCreateChat(renterId);
                        }
                    });
                });

            }).catch(error => {
                console.error("Error loading bookings:", error);
                ownerBookingsList.innerHTML = `<div class="alert alert-danger">Gagal memuat pesanan: ${error.message}</div>`;
            });
        };

        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (!doc.exists || doc.data().role !== 'owner') {
                        window.location.href = 'main.html';
                        return;
                    }

                    loadOwnerDashboardStats(user.uid);
                    loadOwnerOffices(user.uid);
                    loadOwnerBookings(user.uid);
                });

                // GANTI SEMUA KODE addOfficeForm.addEventListener DENGAN INI
                addOfficeForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const submitButton = addOfficeForm.querySelector('button[type="submit"]');
                    const imageFiles = document.getElementById('image').files;

                    if (imageFiles.length === 0) {
                        Toast.fire({ icon: 'warning', title: 'Silakan pilih minimal satu gambar.' });
                        return;
                    }

                    submitButton.disabled = true;
                    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengupload...';

                    // !! PERINGATAN KEAMANAN !!
                    // Kunci API yang terlihat di sini tidak aman. 
                    // Pertimbangkan untuk memindahkannya ke backend seperti Cloud Function.
                    const apiKey = '5e43898d4fb8147933d7b891113c23fc';
                    const uploadPromises = [];

                    for (const file of imageFiles) {
                        const formData = new FormData();
                        formData.append('image', file);

                        const uploadPromise = fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                            method: 'POST',
                            body: formData
                        }).then(response => response.json());
                        uploadPromises.push(uploadPromise);
                    }

                    Promise.all(uploadPromises)
                        .then(results => {
                            const imageUrls = results
                                .map(result => (result.success ? result.data.url : null))
                                .filter(url => url !== null);

                            if (imageFiles.length !== imageUrls.length) {
                                throw new Error('Beberapa gambar gagal diupload.');
                            }

                            // --- PERBAIKAN UTAMA DI SINI ---
                            const priceValue = document.getElementById('price').value;

                            const officeData = {
                                title: document.getElementById('title').value,
                                address: document.getElementById('address').value,
                                city: document.getElementById('city').value,
                                // PASTIKAN INI: Simpan sebagai NUMBER
                                price: parseInt(document.getElementById('price').value.replace(/[^0-9]/g, ''), 10),
                                description: document.getElementById('description').value,
                                images: imageUrls,
                                ownerId: auth.currentUser.uid,
                                lat: parseFloat(document.getElementById('latitude').value),
                                lng: parseFloat(document.getElementById('longitude').value),
                                reviewCount: 0,
                                ratingSum: 0
                            };
                            return db.collection('offices').add(officeData);
                        })
                        .then(() => {
                            Toast.fire({ icon: 'success', title: 'Kantor baru berhasil ditambahkan!' });
                            addOfficeForm.reset();
                            // Panggil fungsi untuk muat ulang peta ke posisi default jika ada
                            if (map && marker) {
                                const defaultCoords = [-6.2088, 106.8456]; // Jakarta
                                map.setView(defaultCoords, 13);
                                marker.setLatLng(defaultCoords);
                            }
                            loadOwnerOffices(auth.currentUser.uid); // Muat ulang daftar kantor
                        })
                        .catch(error => {
                            console.error("Error:", error);
                            Swal.fire({ icon: 'error', title: 'Gagal Menambahkan', text: error.message });
                        })
                        .finally(() => {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Tambahkan Kantor';
                        });
                });

            } else {
                window.location.href = 'register.html';
            }
        });

        function loadOwnerOffices(ownerId) {
            const ownerOfficesList = document.getElementById('owner-offices-list');
            ownerOfficesList.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat kantor...</p></div>`;

            db.collection('offices').where('ownerId', '==', ownerId).get().then(querySnapshot => {
                if (querySnapshot.empty) {
                    ownerOfficesList.innerHTML = '<p class="text-muted">Anda belum menambahkan kantor.</p>';
                    return;
                }

                ownerOfficesList.innerHTML = '';
                querySnapshot.forEach(doc => {
                    const office = doc.data();
                    const officeId = doc.id;

                    const officeElement = document.createElement('div');
                    officeElement.className = 'list-group-item d-flex gap-3 py-3';

                    officeElement.innerHTML = `
                        <img src="${office.image}" alt="${office.title}" style="width: 120px; height: 90px; object-fit: cover;" class="rounded">
                        <div class="flex-grow-1">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${office.title}</h6>
                                <div>
                                    <a href="details.html?id=${officeId}" class="btn btn-info btn-sm me-2">Lihat Ulasan</a>
                                    <a href="edit-office.html?id=${officeId}" class="btn btn-warning btn-sm me-2">Edit</a>
                                    <button class="btn btn-danger btn-sm delete-office-btn" data-id="${officeId}">Hapus</button>
                                </div>
                            </div>
                            <small class="text-muted">${office.city}</small>
                            <div class="mt-2">
                                <span class="badge bg-primary">
                                    <i class="bi bi-calendar-check-fill me-1"></i>
                                    Terpesan <span id="booking-count-${officeId}">...</span> kali
                                </span>
                            </div>
                        </div>
                    `;

                    ownerOfficesList.appendChild(officeElement);

                    db.collection('bookings').where('id', '==', officeId).get().then(bookingSnapshot => {
                        const bookingCount = bookingSnapshot.size;
                        const countElement = document.getElementById(`booking-count-${officeId}`);
                        if (countElement) {
                            countElement.textContent = bookingCount;
                        }
                    });
                });

                document.querySelectorAll('.delete-office-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const officeIdToDelete = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Kantor Ini?',
                            text: "Tindakan ini tidak dapat dibatalkan!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('offices').doc(officeIdToDelete).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Kantor berhasil dihapus.' });
                                    loadOwnerOffices(ownerId);
                                }).catch(error => console.error("Error removing document: ", error));
                            }
                        });
                    });
                });
            });
        }
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN EDIT KANTOR
    // =========================================================================
    const editOfficeForm = document.getElementById('edit-office-form');
    if (editOfficeForm) {
        auth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'register.html';
                return;
            }
            const apiKey = '5e43898d4fb8147933d7b891113c23fc';
            const params = new URLSearchParams(window.location.search);
            const officeId = params.get('id');
            if (!officeId) {
                window.location.href = 'owner.html';
                return;
            }
            const titleInput = document.getElementById('title');
            const addressInput = document.getElementById('address');
            const cityInput = document.getElementById('city');
            const priceInput = document.getElementById('price');
            const imageInput = document.getElementById('image');
            const descriptionInput = document.getElementById('description');
            const submitButton = editOfficeForm.querySelector('button[type="submit"]');
            const officeRef = db.collection('offices').doc(officeId);
            let existingImageUrl = '';
            officeRef.get().then(doc => {
                if (doc.exists) {
                    if (doc.data().ownerId !== user.uid) {
                        window.location.href = 'owner.html';
                        return;
                    }
                    const data = doc.data();
                    titleInput.value = data.title;
                    addressInput.value = data.address;
                    cityInput.value = data.city;
                    priceInput.value = data.price;
                    descriptionInput.value = data.description;
                    existingImageUrl = data.image;
                } else {
                    window.location.href = 'owner.html';
                }
            });
            editOfficeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newImageFile = imageInput.files[0];
                const updateFirestore = (imageUrl) => {
                    const updatedData = {
                        title: titleInput.value,
                        address: addressInput.value,
                        city: cityInput.value,
                        price: priceInput.value,
                        description: descriptionInput.value,
                        image: imageUrl
                    };
                    officeRef.update(updatedData)
                        .then(() => {
                            Toast.fire({ icon: 'success', title: 'Data berhasil diperbarui!' })
                                .then(() => {
                                    window.location.href = 'owner.html';
                                });
                        })
                        .catch(error => {
                            console.error("Error updating document: ", error);
                            Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: error.message });
                            submitButton.disabled = false;
                            submitButton.textContent = 'Simpan Perubahan';
                        });
                };
                submitButton.disabled = true;
                submitButton.textContent = 'Menyimpan...';
                if (newImageFile) {
                    submitButton.textContent = 'Mengupload Gambar Baru...';
                    const formData = new FormData();
                    formData.append('image', newImageFile);
                    fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: formData
                    })
                        .then(response => response.json())
                        .then(result => {
                            if (result.success) {
                                const newImageUrl = result.data.url;
                                updateFirestore(newImageUrl);
                            } else {
                                throw new Error(result.error.message);
                            }
                        })
                        .catch(error => {
                            console.error("Upload error:", error);
                            Swal.fire({ icon: 'error', title: 'Upload Gagal', text: error.message });
                            submitButton.disabled = false;
                            submitButton.textContent = 'Simpan Perubahan';
                        });
                } else {
                    updateFirestore(existingImageUrl);
                }
            });
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN ADMIN
    // =========================================================================
    const adminDashboard = document.getElementById('admin-dashboard');
    if (adminDashboard) {
        const usersList = document.getElementById('users-list');
        const bookingsList = document.getElementById('bookings-list');
        const officesListAdmin = document.getElementById('offices-list-admin');

        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (!doc.exists || doc.data().role !== 'admin') {
                        window.location.href = 'main.html';
                        return;
                    }
                    loadAdminStats();
                    loadAdminFinancialStats();
                    loadAllUsers();
                    loadAllBookings();
                    loadAllOfficesForAdmin();
                });
            } else {
                window.location.href = 'register.html';
            }
        });

        function loadAdminStats() {
            db.collection('users').get().then(snap => { document.getElementById('total-users').textContent = snap.size; });
            db.collection('users').where('role', '==', 'owner').get().then(snap => { document.getElementById('total-owners').textContent = snap.size; });
            db.collection('offices').get().then(snap => { document.getElementById('total-offices').textContent = snap.size; });
            db.collection('bookings').get().then(snap => { document.getElementById('total-bookings').textContent = snap.size; });
        }

        function loadAdminFinancialStats() {
            const totalGmvEl = document.getElementById('total-gmv');
            const totalPlatformRevenueEl = document.getElementById('total-platform-revenue');

            if (totalGmvEl) totalGmvEl.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;
            if (totalPlatformRevenueEl) totalPlatformRevenueEl.innerHTML = `<div class="spinner-border spinner-border-sm" role="status"></div>`;

            db.collection('bookings').get().then(querySnapshot => {
                let totalGmv = 0;
                querySnapshot.forEach(doc => {
                    const booking = doc.data();
                    const priceString = booking.totalPrice || booking.price || '0';
                    const priceNumber = parseInt(priceString.replace(/[^0-9]/g, '')) || 0;
                    totalGmv += priceNumber;
                });

                const platformRevenue = totalGmv * ADMIN_FEE_PERCENTAGE;

                if (totalGmvEl) {
                    totalGmvEl.textContent = 'Rp' + totalGmv.toLocaleString('id-ID');
                }
                if (totalPlatformRevenueEl) {
                    totalPlatformRevenueEl.textContent = 'Rp' + platformRevenue.toLocaleString('id-ID');
                }
            }).catch(error => {
                console.error("Error loading admin financial stats:", error);
                if (totalGmvEl) totalGmvEl.textContent = 'Error';
                if (totalPlatformRevenueEl) totalPlatformRevenueEl.textContent = 'Error';
            });
        }

        function loadAllUsers() {
            db.collection('users').get().then(querySnapshot => {
                usersList.innerHTML = '';
                querySnapshot.forEach(doc => {
                    const userData = doc.data();
                    const deleteButtonHTML = userData.role !== 'admin' ? `<button class="btn btn-outline-danger btn-sm delete-user-btn" data-id="${doc.id}">Hapus</button>` : '';
                    usersList.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><h6 class="mb-1">${userData.name}</h6><small>${userData.email} | Peran: ${userData.role}</small></div>${deleteButtonHTML}</div>`;
                });

                document.querySelectorAll('.delete-user-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const userId = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Pengguna?',
                            text: "Data pengguna akan dihapus dari database.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('users').doc(userId).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Data pengguna dihapus.' });
                                    loadAllUsers();
                                });
                            }
                        });
                    });
                });
            });
        }

        function loadAllBookings() {
            db.collection('bookings').orderBy('bookingTimestamp', 'desc').get().then(querySnapshot => {
                bookingsList.innerHTML = '';
                if (querySnapshot.empty) {
                    bookingsList.innerHTML = `<p class="text-muted">Belum ada pesanan.</p>`;
                    return;
                }
                querySnapshot.forEach(doc => {
                    const bookingData = doc.data();
                    bookingsList.innerHTML += `<a href="receipt.html?bookingId=${doc.id}" class="list-group-item list-group-item-action"><div class="d-flex w-100 justify-content-between"><h6 class="mb-1">${bookingData.title}</h6><small>${bookingData.bookingDate}</small></div><small>ID Pesanan: ${doc.id}</small></a>`;
                });
            });
        }

        function loadAllOfficesForAdmin() {
            db.collection('offices').get().then(querySnapshot => {
                officesListAdmin.innerHTML = '';
                if (querySnapshot.empty) {
                    officesListAdmin.innerHTML = `<p class="text-muted">Belum ada kantor yang ditambahkan.</p>`;
                    return;
                }
                querySnapshot.forEach(doc => {
                    const officeData = doc.data();
                    officesListAdmin.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><h6 class="mb-1">${officeData.title}</h6><small>${officeData.city || officeData.location}</small></div><button class="btn btn-outline-danger btn-sm delete-office-btn" data-id="${doc.id}">Hapus</button></div>`;
                });
                document.querySelectorAll('.delete-office-btn').forEach(button => {
                    button.addEventListener('click', function () {
                        const officeId = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Kantor Ini?',
                            text: "Tindakan ini tidak dapat dibatalkan!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('offices').doc(officeId).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Kantor berhasil dihapus.' });
                                    loadAllOfficesForAdmin();
                                }).catch(error => {
                                    console.error("Error removing document: ", error);
                                });
                            }
                        });
                    });
                });
            });
        }
    }

});
// =========================================================================
// CHAT INITIALIZATION - SIMPLE FIX
// =========================================================================

// Fungsi untuk initialize tombol chat
function initializeChatButtons() {
    console.log('🔧 Initializing chat buttons...');

    // Tombol chat di details.html
    const chatWithOwnerBtn = document.getElementById('chat-with-owner-btn');
    if (chatWithOwnerBtn) {
        chatWithOwnerBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('💬 Chat button clicked in details');

            const params = new URLSearchParams(window.location.search);
            const officeId = params.get('id');

            if (!officeId) {
                Swal.fire('Error', 'Office ID tidak ditemukan', 'error');
                return;
            }

            // Get office data to find ownerId
            db.collection('offices').doc(officeId).get().then(doc => {
                if (doc.exists) {
                    const officeData = doc.data();
                    const ownerId = officeData.ownerId;

                    if (ownerId) {
                        console.log('👤 Found owner:', ownerId);
                        if (typeof getOrCreateChat === 'function') {
                            getOrCreateChat(ownerId, officeId);
                        } else {
                            console.error('❌ getOrCreateChat function not found');
                            Swal.fire('Error', 'Fungsi chat tidak tersedia', 'error');
                        }
                    } else {
                        Swal.fire('Error', 'Pemilik tidak ditemukan', 'error');
                    }
                }
            }).catch(error => {
                console.error('Error getting office data:', error);
                Swal.fire('Error', 'Gagal memuat data kantor', 'error');
            });
        });
    }

    // Tombol contact owner di receipt.html
    const contactOwnerBtn = document.getElementById('contact-owner-btn');
    if (contactOwnerBtn) {
        contactOwnerBtn.addEventListener('click', function (e) {
            e.preventDefault();
            console.log('💬 Contact owner button clicked in receipt');

            const params = new URLSearchParams(window.location.search);
            const bookingId = params.get('bookingId');

            if (bookingId) {
                db.collection('bookings').doc(bookingId).get().then(doc => {
                    if (doc.exists) {
                        const bookingData = doc.data();
                        const ownerId = bookingData.ownerId;
                        const officeId = bookingData.id;

                        console.log('👤 Found owner from receipt:', ownerId);
                        if (ownerId && typeof getOrCreateChat === 'function') {
                            getOrCreateChat(ownerId, officeId);
                        }
                    }
                }).catch(error => {
                    console.error('Error getting booking data:', error);
                    Swal.fire('Error', 'Gagal memuat data pemesanan', 'error');
                });
            }
        });
    }

    // Tombol chat di owner.html
    const chatRenterBtns = document.querySelectorAll('.chat-renter-btn');
    chatRenterBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const officeId = this.getAttribute('data-office-id');

            console.log('💬 Chat renter button clicked:', officeId);

            if (officeId) {
                db.collection('bookings').doc(officeId).get().then(doc => {
                    if (doc.exists) {
                        const bookingData = doc.data();
                        const renterId = bookingData.userId;

                        console.log('👤 Found renter:', renterId);
                        if (renterId && typeof getOrCreateChat === 'function') {
                            getOrCreateChat(renterId, officeId);
                        }
                    }
                }).catch(error => {
                    console.error('Error getting booking data:', error);
                    Swal.fire('Error', 'Gagal memuat data penyewa', 'error');
                });
            }
        });
    });
}

// Initialize chat buttons ketika DOM ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initializeChatButtons, 2000); // Delay 2 detik untuk memastikan semua element loaded
});