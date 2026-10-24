/**
 * Logika Interaktif Form Pemesanan, Refresh Nonce Anti-Cache, & Detail Tarif Bertingkat Ryokourent
 *
 * Menerapkan:
 * - D-18: Tarif 2 kategori (Harian: 1 hari, 1 minggu, 2 minggu; Jam: 12, 9, 6, 3 jam; Paket promo).
 * - D-21 & QA-02: Validasi klien anti-16 digit NIK KTP sebelum kirim AJAX.
 * - D-26: Pool hanya sebagai tempat parkir fisik (stok ketersediaan dihitung global).
 * - D-27: Menampilkan #ryokou_denda_shortrent_note saat kategori Jam (ShortRent) dipilih.
 * - QA-21: Refresh Nonce & Signed Time Token otomatis saat halaman dimuat agar aman dari page caching.
 */

document.addEventListener('DOMContentLoaded', function() {
	var ajaxUrl = (typeof ryokouPublicVars !== 'undefined' && ryokouPublicVars.ajax_url) ? ryokouPublicVars.ajax_url : '/wp-admin/admin-ajax.php';
	var motorsPricing = (typeof ryokouPublicVars !== 'undefined' && ryokouPublicVars.motors_pricing) ? ryokouPublicVars.motors_pricing : {};

	function formatRupiahJs(amount) {
		return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	}

	function formatDateForInput(d, hour, minute) {
		var year = d.getFullYear();
		var month = String(d.getMonth() + 1).padStart(2, '0');
		var day = String(d.getDate()).padStart(2, '0');
		var h = String(typeof hour !== 'undefined' ? hour : d.getHours()).padStart(2, '0');
		var m = String(typeof minute !== 'undefined' ? minute : d.getMinutes()).padStart(2, '0');
		return year + '-' + month + '-' + day + 'T' + h + ':' + m;
	}

	var form = document.getElementById('ryokou-public-booking-form');
	if (!form) return;

	var nonceField         = document.getElementById('ryokou_nonce_field');
	var timeTokenField     = document.getElementById('ryokou_time_token_field');
	var motorSelect        = document.getElementById('ryokou_motor_select');
	var poolSelect         = document.getElementById('ryokou_pool_select');
	var formCategorySelect = document.getElementById('ryokou_form_category_select');
	var formSubtierSelect  = document.getElementById('ryokou_form_subtier_select');
	var labelDurasiInput   = document.getElementById('ryokou_label_durasi_input');
	var tglMulaiInput      = document.getElementById('ryokou_tgl_mulai');
	var tglSelesaiInput    = document.getElementById('ryokou_tgl_selesai');
	var namaInput          = document.getElementById('ryokou_nama');
	var nomorWaInput       = document.getElementById('ryokou_nomor_wa');
	var tandaPelangganInput= document.getElementById('ryokou_tanda_pelanggan');
	var alamatAntarInput   = document.getElementById('ryokou_alamat_antar');
	var alamatJemputInput  = document.getElementById('ryokou_alamat_jemput');
	var submitBtn          = document.getElementById('ryokou-submit-btn');
	var errorBox           = document.getElementById('ryokou-form-error-msg');
	var indicatorBox       = document.getElementById('ryokou-stock-indicator');
	var indicatorBadge     = document.getElementById('ryokou-indicator-badge');
	var indicatorText      = document.getElementById('ryokou-indicator-text');
	var warningBox         = document.getElementById('ryokou-operating-hours-warning');
	var displayDurasi      = document.getElementById('ryokou-display-durasi');
	var displayTarif       = document.getElementById('ryokou-display-tarif-harian');
	var displayTotal       = document.getElementById('ryokou-display-total');

	// QA-21: Refresh Nonce & Time Token untuk halaman ter-cache
	var refreshData = new FormData();
	refreshData.append('action', 'ryokourent_refresh_nonce');
	fetch(ajaxUrl, { method: 'POST', body: refreshData })
		.then(function(r) { return r.json(); })
		.then(function(res) {
			if (res && res.success && res.data) {
				if (nonceField && res.data.nonce) nonceField.value = res.data.nonce;
				if (timeTokenField && res.data.time_token) timeTokenField.value = res.data.time_token;
			}
		})
		.catch(function() {});

	var now = new Date();
	var tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	var dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

	if (tglMulaiInput && !tglMulaiInput.value) {
		tglMulaiInput.value = formatDateForInput(tomorrow, 8, 0);
	}
	if (tglSelesaiInput && !tglSelesaiInput.value) {
		tglSelesaiInput.value = formatDateForInput(dayAfter, 8, 0);
	}

	function syncFormSubtierOptions() {
		var selectedCat = formCategorySelect.value;
		var motorId = motorSelect.value;
		var motorData = motorsPricing[motorId] || null;

		var shortRentNote = document.getElementById('ryokou_denda_shortrent_note');
		if (shortRentNote) {
			shortRentNote.style.display = (selectedCat === 'jam') ? 'block' : 'none';
		}

		formSubtierSelect.innerHTML = '';

		if (selectedCat === 'kustom') {
			var optKustom = document.createElement('option');
			optKustom.value = 'kustom';
			optKustom.textContent = 'Atur Bebas (Kustom Tanggal/Jam)';
			optKustom.setAttribute('data-hours', '0');
			formSubtierSelect.appendChild(optKustom);
			if (labelDurasiInput) labelDurasiInput.value = 'Kustom Tanggal/Jam Bebas';
			recalculatePricing();
			return;
		}

		if (motorData && motorData.kategori && motorData.kategori[selectedCat] && motorData.kategori[selectedCat].sub) {
			var subItems = motorData.kategori[selectedCat].sub;
			for (var key in subItems) {
				if (!subItems.hasOwnProperty(key)) continue;
				var itm = subItems[key];
				var opt = document.createElement('option');
				opt.value = itm.key || key;
				opt.textContent = itm.label + ' — ' + (itm.harga_format || formatRupiahJs(itm.harga || 0));
				opt.setAttribute('data-hours', itm.durasi_jam || 24);
				opt.setAttribute('data-harga', itm.harga || 0);
				opt.setAttribute('data-price-fmt', itm.harga_format || '');
				opt.setAttribute('data-label-clean', itm.label);
				formSubtierSelect.appendChild(opt);
			}
		} else {
			if (selectedCat === 'harian') {
				var harianTiers = [
					{ val: '1_hari', label: '1 Hari (24 Jam)', hours: 24 },
					{ val: '1_minggu', label: '1 Minggu (7 Hari)', hours: 168 },
					{ val: '2_minggu', label: '2 Minggu (14 Hari)', hours: 336 }
				];
				harianTiers.forEach(function(ht) {
					var o = document.createElement('option');
					o.value = ht.val;
					o.textContent = ht.label;
					o.setAttribute('data-hours', ht.hours);
					formSubtierSelect.appendChild(o);
				});
			} else if (selectedCat === 'jam') {
				var jamTiers = [
					{ val: '12_jam', label: '12 Jam (Denda = Denda Harian)', hours: 12 },
					{ val: '9_jam', label: '9 Jam (Telat 60m -> Masuk 12 Jam)', hours: 9 },
					{ val: '6_jam', label: '6 Jam (Telat 60m -> Masuk 9 Jam)', hours: 6 },
					{ val: '3_jam', label: '3 Jam (Telat 60m -> Masuk 6 Jam)', hours: 3 }
				];
				jamTiers.forEach(function(jt) {
					var o = document.createElement('option');
					o.value = jt.val;
					o.textContent = jt.label;
					o.setAttribute('data-hours', jt.hours);
					formSubtierSelect.appendChild(o);
				});
			}
		}

		applyDurationToDates();
	}

	function applyDurationToDates() {
		var selectedOpt = formSubtierSelect.options[formSubtierSelect.selectedIndex];
		if (!selectedOpt) return;

		var hours = parseFloat(selectedOpt.getAttribute('data-hours') || '0');
		var cleanLabel = selectedOpt.getAttribute('data-label-clean') || selectedOpt.textContent;
		if (labelDurasiInput) {
			labelDurasiInput.value = cleanLabel;
		}

		if (hours > 0 && tglMulaiInput.value) {
			var startDt = new Date(tglMulaiInput.value);
			var endDt = new Date(startDt.getTime() + hours * 3600 * 1000);
			tglSelesaiInput.value = formatDateForInput(endDt, endDt.getHours(), endDt.getMinutes());
		}

		recalculatePricing();
	}

	function recalculatePricing() {
		var motorOption = motorSelect.options[motorSelect.selectedIndex];
		var baseDailyPrice = motorOption ? parseInt(motorOption.getAttribute('data-harga') || '80000', 10) : 80000;

		var mulaiVal = tglMulaiInput.value;
		var selesaiVal = tglSelesaiInput.value;

		if (!mulaiVal || !selesaiVal) {
			displayDurasi.textContent = '-';
			displayTarif.textContent = '-';
			displayTotal.textContent = '-';
			return;
		}

		var startDt = new Date(mulaiVal);
		var endDt = new Date(selesaiVal);

		if (endDt <= startDt) {
			displayDurasi.textContent = 'Jadwal tidak valid';
			displayTotal.textContent = '-';
			return;
		}

		var diffMs = endDt.getTime() - startDt.getTime();
		var diffHours = diffMs / (1000 * 60 * 60);

		var selectedCat = formCategorySelect.value;
		var selectedSubOpt = formSubtierSelect.options[formSubtierSelect.selectedIndex];
		var subLabelClean = selectedSubOpt ? (selectedSubOpt.getAttribute('data-label-clean') || selectedSubOpt.textContent) : '1 Hari (24 Jam)';

		var total = 0;
		var tarifText = '-';

		if (selectedCat !== 'kustom' && selectedSubOpt && selectedSubOpt.getAttribute('data-harga')) {
			var tierPrice = parseInt(selectedSubOpt.getAttribute('data-harga') || '0', 10);
			total = tierPrice;
			tarifText = formatRupiahJs(tierPrice) + ' (' + subLabelClean + ')';
			displayDurasi.textContent = subLabelClean + ' (' + diffHours.toFixed(1) + ' Jam riil)';
		} else {
			var days = Math.max(1, Math.ceil(diffHours / 24));
			total = days * baseDailyPrice;
			tarifText = formatRupiahJs(baseDailyPrice) + ' / hari';
			displayDurasi.textContent = days + ' Hari (' + diffHours.toFixed(1) + ' Jam)';
		}

		displayTarif.textContent = tarifText;
		displayTotal.textContent = formatRupiahJs(total);

		var startHour = startDt.getHours();
		var endHour = endDt.getHours();
		warningBox.style.display = (startHour < 7 || startHour >= 23 || endHour < 7 || endHour >= 23) ? 'flex' : 'none';

		checkAvailabilityLive();
	}

	var debounceTimer = null;
	function checkAvailabilityLive() {
		var motorId = motorSelect.value;
		var mulai = tglMulaiInput.value;
		var selesai = tglSelesaiInput.value;

		if (!motorId || !mulai || !selesai) {
			indicatorBox.style.display = 'none';
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(function() {
			var formData = new FormData();
			formData.append('action', 'ryokourent_check_stock');
			formData.append('motor_id', motorId);
			formData.append('tanggal_mulai', mulai.replace('T', ' '));
			formData.append('tanggal_selesai', selesai.replace('T', ' '));

			fetch(ajaxUrl, {
				method: 'POST',
				body: formData
			})
			.then(function(res) { return res.json(); })
			.then(function(response) {
				if (response.success && response.data) {
					var data = response.data;
					indicatorBox.style.display = 'block';
					indicatorBadge.className = 'ryokou-indicator-badge ' + data.status;
					indicatorBadge.textContent = data.label;
					indicatorText.textContent = data.pesan;

					if (data.status === 'habis' || data.status === 'merah') {
						submitBtn.querySelector('.ryokou-btn-text').textContent = 'Pesan via WA (Konfirmasi Ketersediaan)';
					} else {
						submitBtn.querySelector('.ryokou-btn-text').textContent = 'Lanjutkan Pemesanan via WhatsApp';
					}
					submitBtn.disabled = false;
				}
			})
			.catch(function() {});
		}, 400);
	}

	// Klik tombol Pilih Unit dari Katalog
	var katalogBtns = document.querySelectorAll('.ryokou-select-motor-btn');
	katalogBtns.forEach(function(btn) {
		btn.addEventListener('click', function() {
			var mid = btn.getAttribute('data-motor-id');
			if (mid && motorSelect) {
				motorSelect.value = mid;
				syncFormSubtierOptions();
			}
		});
	});

	// Submit Form via AJAX -> Redirect ke WhatsApp (`api.whatsapp.com`)
	form.addEventListener('submit', function(e) {
		e.preventDefault();
		errorBox.style.display = 'none';

		var combinedText = (namaInput ? namaInput.value : '') + ' ' + (alamatAntarInput ? alamatAntarInput.value : '') + ' ' + (alamatJemputInput ? alamatJemputInput.value : '');
		var nikRegex = /(?:\d[\s\-]?){16}/;
		if (nikRegex.test(combinedText)) {
			errorBox.textContent = 'Demi pelindungan data pribadi (UU PDP No. 27/2022), DILARANG menuliskan 16 digit NIK KTP pada formulir ini.';
			errorBox.style.display = 'block';
			return;
		}

		if (nomorWaInput && !nomorWaInput.value.trim()) {
			errorBox.textContent = 'Mohon masukkan nomor WhatsApp / HP aktif untuk konfirmasi pemesanan.';
			errorBox.style.display = 'block';
			return;
		}

		submitBtn.disabled = true;
		var formData = new FormData(form);
		formData.append('action', 'ryokourent_submit_booking');

		fetch(ajaxUrl, {
			method: 'POST',
			body: formData
		})
		.then(function(res) { return res.json(); })
		.then(function(response) {
			submitBtn.disabled = false;
			if (response.success && response.data && response.data.whatsapp_url) {
				window.location.href = response.data.whatsapp_url;
			} else {
				var msg = (response.data && response.data.message) ? response.data.message : 'Gagal memproses pesanan.';
				errorBox.textContent = msg;
				errorBox.style.display = 'block';
			}
		})
		.catch(function() {
			submitBtn.disabled = false;
			errorBox.textContent = 'Terjadi gangguan jaringan. Silakan coba lagi.';
			errorBox.style.display = 'block';
		});
	});

	motorSelect.addEventListener('change', syncFormSubtierOptions);
	formCategorySelect.addEventListener('change', syncFormSubtierOptions);
	formSubtierSelect.addEventListener('change', applyDurationToDates);
	poolSelect.addEventListener('change', recalculatePricing);
	tglMulaiInput.addEventListener('change', function() {
		if (formCategorySelect.value !== 'kustom') {
			applyDurationToDates();
		} else {
			recalculatePricing();
		}
	});
	tglSelesaiInput.addEventListener('change', recalculatePricing);

	syncFormSubtierOptions();
});
