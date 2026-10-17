

/* ==========================================================
   共用測驗與介面引擎 (quiz-engine.js)
   ================================================---------- */

/* --- Web Audio API 提示音效產生器 --- */
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// 答對音效：輕快上揚的雙音「叮咚」
function playDingDongSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.12);
        gain2.gain.setValueAtTime(0.3, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.35);
    } catch (e) {
        console.log("Audio not supported or blocked");
    }
}

// 答錯音效：低沉下行的雙音「喔喔」
function playWrongSound() {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(180, now);
        osc1.frequency.exponentialRampToValueAtTime(140, now + 0.18);
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.18);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(130, now + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.38);
        gain2.gain.setValueAtTime(0.2, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.38);
    } catch (e) {
        console.log("Audio not supported or blocked");
    }
}

// 語音播放
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        alert('您的瀏覽器不支援語音播放功能。');
    }
}

// 渲染單字卡
function renderWords(lessonId, words) {
    const grid = document.getElementById(lessonId + '-wordGrid');
    if (!grid) return;
    grid.innerHTML = '';
    words.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `
            <div>
                <div class="word-header">
                    <div>
                        <span class="word-title">${item.vocab}</span>
                        ${item.pos ? `<span style="font-size:0.85rem; color:var(--btn-blue); margin-left:6px; font-weight:600;">${item.pos}</span>` : ''}
                        <span style="font-size:0.85rem; color:var(--text-sub); margin-left:6px;">${item.kk || ''}</span>
                    </div>
                    <button class="speech-btn" onclick="speak('${item.vocab}')" title="朗讀">🔊</button>
                </div>
                <div class="word-def">${item.definition}</div>
            </div>
            ${item.extension ? `<div class="word-ext">💡 ${item.extension}</div>` : ''}
        `;
        grid.appendChild(card);
    });
}

// 搜尋過濾（依賴外部的 getDataByLessonId）
function filterWords(lessonId) {
    const searchInput = document.getElementById(lessonId + '-searchInput');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase();
    const data = getDataByLessonId(lessonId);
    const filtered = data.filter(item => 
        item.vocab.toLowerCase().includes(query) || 
        (item.kk && item.kk.toLowerCase().includes(query)) ||
        item.definition.toLowerCase().includes(query) ||
        (item.extension && item.extension.toLowerCase().includes(query))
    );
    renderWords(lessonId, filtered);
}

// 大分頁切換（動態版：支援無限多個單元）
function switchLesson(lessonName, btnElement) {
    // 移除所有按鈕與內容容器的 active 狀態
    document.querySelectorAll('.lesson-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.lesson-content').forEach(content => content.classList.remove('active'));

    // 點亮當前點擊的按鈕（如果HTML有傳入 this）
    if (btnElement) {
        btnElement.classList.add('active');
    }

    // 自動依據 lessonName 尋找對應的容器並顯示（例如 'lesson1' -> 'lesson1-container'）
    const targetContainer = document.getElementById(lessonName + '-container');
    if (targetContainer) {
        targetContainer.classList.add('active');
    }
}

// 小分頁切換（動態版）
function switchTab(lessonId, tabName, btnElement) {
    // 找出當前分頁所屬的父容器
    // 假設容器 ID 是 l1 對應 lesson1-container，或者是 lesson1 本身
    const containerId = lessonId.startsWith('l') ? lessonId.replace('l', 'lesson') + '-container' : lessonId + '-container';
    // 或者直接用通用包裝
    const container = document.querySelector('.lesson-content.active');
    if (!container) return;

    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tabName === 'list') {
        container.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById(lessonId + '-list-tab').classList.add('active');
    } else {
        container.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById(lessonId + '-quiz-tab').classList.add('active');
    }
}

/* --- 測驗設定與執行狀態 --- */


// 儲存所有單元測驗狀態的動態容器
const quizState = {};

// 取得（或自動建立）指定單元的測驗狀態
function getQuizState(lessonId) {
    if (!quizState[lessonId]) {
        quizState[lessonId] = {
            type: 'choice',
            count: 10,
            list: [],
            index: 0,
            score: 0,
            wrongItems: [],
            isAnswered: false
        };
    }
    return quizState[lessonId];
}


function setQuizType(lessonId, type) {
    getQuizState(lessonId).type = type;
    const choiceBtn = document.getElementById(lessonId + '-typeChoiceBtn');
    const cnBtn = document.getElementById(lessonId + '-typeChineseToEnglishBtn');
    const spellBtn = document.getElementById(lessonId + '-typeSpellBtn');
    if (choiceBtn) choiceBtn.classList.toggle('active', type === 'choice');
    if (cnBtn) cnBtn.classList.toggle('active', type === 'chineseToEnglish');
    if (spellBtn) spellBtn.classList.toggle('active', type === 'spell');
}

function setQuizCount(lessonId, count) {
    getQuizState(lessonId).count = count;
    const count10Btn = document.getElementById(lessonId + '-count10Btn');
    const count20Btn = document.getElementById(lessonId + '-count20Btn');
    const allBtn = document.getElementById(lessonId + '-countAllBtn');
    if (count10Btn) count10Btn.classList.toggle('active', count === 10);
    if (count20Btn) count20Btn.classList.toggle('active', count === 20);
    if (allBtn) allBtn.classList.toggle('active', count === 'all');
}

function resetQuizSetup(lessonId) {
    // 恢復顯示上方導覽列與標題
    document.querySelectorAll('.lesson-tabs').forEach(el => el.style.display = '');
    const header = document.querySelector('header');
    if (header) header.style.display = '';

    const finalRes = document.getElementById(lessonId + '-quizFinalResult');
    const activeArea = document.getElementById(lessonId + '-quizActiveArea');
    const setupPanel = document.getElementById(lessonId + '-quizSetupPanel');
    if (finalRes) finalRes.style.display = 'none';
    if (activeArea) activeArea.style.display = 'none';
    if (setupPanel) setupPanel.style.display = 'block';
}

function startQuiz(lessonId) {
    getAudioContext(); // 預先解鎖音效權限

    // 進入測驗時隱藏上方導覽列與標題，讓手機畫面不亂跳
    document.querySelectorAll('.lesson-tabs').forEach(el => el.style.display = 'none');
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';

    const setupPanel = document.getElementById(lessonId + '-quizSetupPanel');
    const activeArea = document.getElementById(lessonId + '-quizActiveArea');
    if (setupPanel) setupPanel.style.display = 'none';
    if (activeArea) activeArea.style.display = 'block';

    const sourceData = getDataByLessonId(lessonId);
    const state = getQuizState(lessonId);
    state.score = 0;
    state.index = 0;
    state.wrongItems = [];
    
    const sliceCount = (state.count === 'all') ? sourceData.length : Math.min(state.count, sourceData.length);
    state.list = [...sourceData].sort(() => 0.5 - Math.random()).slice(0, sliceCount);

    loadQuestion(lessonId);
}

function loadQuestion(lessonId) {
    const state = getQuizState(lessonId);
    state.isAnswered = false; 
    const currentWord = state.list[state.index];
    const sourceData = getDataByLessonId(lessonId);

    const banner = document.getElementById(lessonId + '-quizBanner');
    if (banner) {
        banner.style.display = 'none';
        banner.className = 'result-banner';
        banner.innerHTML = '';
    }
    const nextBtn = document.getElementById(lessonId + '-quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'none';

    const progress = document.getElementById(lessonId + '-quizProgress');
    const scoreDisplay = document.getElementById(lessonId + '-quizScore');
    if (progress) progress.innerText = `進度：${state.index + 1} / ${state.list.length}`;
    if (scoreDisplay) scoreDisplay.innerText = `得分：${state.score} 分`;

    const qText = document.getElementById(lessonId + '-questionText');
    const ansArea = document.getElementById(lessonId + '-quizAnswersArea');
    if (!ansArea) return;
    ansArea.innerHTML = '';

    if (state.type === 'choice') {
        qText.innerHTML = `請選出 "<span style="color:var(--primary);">${currentWord.vocab}</span>" 的正確意思：`;
        
        let options = [currentWord.definition];
        const otherDefs = sourceData.filter(w => w.vocab !== currentWord.vocab).map(w => w.definition);
        const shuffledOthers = otherDefs.sort(() => 0.5 - Math.random()).slice(0, 3);
        options = options.concat(shuffledOthers).sort(() => 0.5 - Math.random());

        const prefixLabels = ['(A) ', '(B) ', '(C) ', '(D) '];
        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'single-option-btn';
            btn.setAttribute('data-val', opt);
            btn.innerHTML = `<strong>${prefixLabels[idx]}</strong>${opt}`;
            btn.onclick = () => {
                if (state.isAnswered) return;
                checkChoiceAnswer(lessonId, btn, opt === currentWord.definition, currentWord, 'choice');
            };
            ansArea.appendChild(btn);
        });
    } else if (state.type === 'chineseToEnglish') {
        qText.innerHTML = `請選出中文 "<span style="color:var(--primary);">${currentWord.definition}</span>" 的正確英文單字/片語：`;

        let options = [currentWord.vocab];
        const otherVocabs = sourceData.filter(w => w.vocab !== currentWord.vocab).map(w => w.vocab);
        const shuffledOthers = otherVocabs.sort(() => 0.5 - Math.random()).slice(0, 3);
        options = options.concat(shuffledOthers).sort(() => 0.5 - Math.random());

        const prefixLabels = ['(A) ', '(B) ', '(C) ', '(D) '];
        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'single-option-btn';
            btn.setAttribute('data-val', opt);
            btn.innerHTML = `<strong>${prefixLabels[idx]}</strong>${opt}`;
            btn.onclick = () => {
                if (state.isAnswered) return;
                checkChoiceAnswer(lessonId, btn, opt === currentWord.vocab, currentWord, 'chineseToEnglish');
            };
            ansArea.appendChild(btn);
        });
    } else {
        qText.innerHTML = `請根據中文意思，拼出正確的英文單字或片語：<br><span style="color:var(--primary); font-size:1.3rem;">"${currentWord.definition}"</span> <span style="font-size:0.9rem; color:var(--text-sub);">${currentWord.kk || ''}</span>`;

        ansArea.innerHTML = `
            <div class="input-group">
                <input type="text" id="${lessonId}-spellUserInput" class="spell-input" placeholder="請輸入英文單字或片語..." autocomplete="off" autocapitalize="none" onkeydown="if(event.key === 'Enter') { event.preventDefault(); checkSpellAnswer('${lessonId}'); }">
                <button class="action-sub-btn" id="${lessonId}-spellSubmitBtn" onclick="checkSpellAnswer('${lessonId}')">送出</button>
            </div>
        `;
        const spellInput = document.getElementById(lessonId + '-spellUserInput');
        if (spellInput) spellInput.focus();
    }
}

function checkChoiceAnswer(lessonId, selectedBtn, isCorrect, currentWord, mode) {
    const state = getQuizState(lessonId);
    if (state.isAnswered) return;
    state.isAnswered = true;

    const buttons = document.querySelectorAll('#' + lessonId + '-quizAnswersArea .single-option-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('disabled-muted');
    });

    const banner = document.getElementById(lessonId + '-quizBanner');
    let extText = currentWord.extension ? `<div class="banner-ext-info">💡 詳解與補充：<br>${currentWord.extension}</div>` : '';
    const pointsPerQ = Math.round(100 / state.list.length);
    const targetVal = (mode === 'choice') ? currentWord.definition : currentWord.vocab;

    if (isCorrect) {
        state.score += pointsPerQ;
        selectedBtn.classList.remove('disabled-muted');
        selectedBtn.classList.add('selected-correct');
        if (banner) {
            banner.className = 'result-banner correct';
            banner.innerHTML = `🎉 答對了！ ${extText}`;
            banner.style.display = 'block';
        }
        playDingDongSound();
    } else {
        selectedBtn.classList.remove('disabled-muted');
        selectedBtn.classList.add('selected-wrong');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-val') === targetVal) {
                btn.classList.remove('disabled-muted');
                btn.classList.add('selected-correct');
            }
        });
        if (banner) {
            banner.className = 'result-banner wrong';
            banner.innerHTML = `✕ 答錯囉！正確答案是：<strong>${targetVal}</strong> ${extText}`;
            banner.style.display = 'block';
        }
        playWrongSound();
        
        if (!state.wrongItems.some(item => item.vocab === currentWord.vocab)) {
            state.wrongItems.push(currentWord);
        }
    }

    const scoreDisplay = document.getElementById(lessonId + '-quizScore');
    if (scoreDisplay) scoreDisplay.innerText = `得分：${state.score} 分`;
    showNextButton(lessonId);
}

function checkSpellAnswer(lessonId) {
    const state = getQuizState(lessonId);
    if (state.isAnswered) return;

    const inputField = document.getElementById(lessonId + '-spellUserInput');
    if (!inputField || inputField.disabled) return;

    const userVal = inputField.value.trim().toLowerCase();
    if (!userVal) {
        inputField.focus();
        return;
    }

    state.isAnswered = true;
    inputField.disabled = true;
    const submitBtn = document.getElementById(lessonId + '-spellSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    const currentWord = state.list[state.index];
    const correctVal = currentWord.vocab.toLowerCase();
    const banner = document.getElementById(lessonId + '-quizBanner');
    let extText = currentWord.extension ? `<div class="banner-ext-info">💡 詳解與補充：<br>${currentWord.extension}</div>` : '';
    const pointsPerQ = Math.round(100 / state.list.length);
    const isCorrect = (userVal === correctVal);

    if (isCorrect) {
        state.score += pointsPerQ;
        inputField.classList.add('correct-input');
        if (banner) {
            banner.className = 'result-banner correct';
            banner.innerHTML = `🎉 拼寫正確！ ${extText}`;
            banner.style.display = 'block';
        }
        playDingDongSound();
    } else {
        inputField.classList.add('wrong-input');
        if (banner) {
            banner.className = 'result-banner wrong';
            banner.innerHTML = `✕ 拼寫錯誤！正確答案是：<strong>${currentWord.vocab}</strong> ${extText}`;
            banner.style.display = 'block';
        }
        playWrongSound();
        
        if (!state.wrongItems.some(item => item.vocab === currentWord.vocab)) {
            state.wrongItems.push(currentWord);
        }
    }

    const scoreDisplay = document.getElementById(lessonId + '-quizScore');
    if (scoreDisplay) scoreDisplay.innerText = `得分：${state.score} 分`;
    showNextButton(lessonId);
}

function showNextButton(lessonId) {
    const state = getQuizState(lessonId);
    const nextBtn = document.getElementById(lessonId + '-quizNextBtn');
    if (!nextBtn) return;
    if (state.index < state.list.length - 1) {
        nextBtn.innerText = '下一題 ➔';
    } else {
        nextBtn.innerText = '查看測驗結果與錯題整理 🏆';
    }
    nextBtn.style.display = 'block';
    nextBtn.focus();
}

function nextQuestion(lessonId) {
    const state = getQuizState(lessonId);
    state.index++;
    if (state.index < state.list.length) {
        loadQuestion(lessonId);
    } else {
        const activeArea = document.getElementById(lessonId + '-quizActiveArea');
        const finalScoreDisp = document.getElementById(lessonId + '-finalScoreDisplay');
        const finalResultArea = document.getElementById(lessonId + '-quizFinalResult');
        
        if (activeArea) activeArea.style.display = 'none';
        if (finalScoreDisp) finalScoreDisp.innerText = `${state.score} / 100`;
        
        const wrongContainer = document.getElementById(lessonId + '-wrongReviewContainer');
        if (wrongContainer) {
            if (state.wrongItems.length > 0) {
                let html = `
                    <div class="wrong-review-section">
                        <div class="wrong-review-title">⚠ 本次測驗錯題複習 (${state.wrongItems.length} 題)</div>
                `;
                state.wrongItems.forEach(item => {
                    html += `
                        <div class="wrong-item-card">
                            <strong>${item.vocab}</strong> <span style="font-size:0.85rem; color:#718096;">${item.kk || ''}</span><br>
                            <span style="color:var(--text-main); font-weight:500;">意思：${item.definition}</span>
                            ${item.extension ? `<div style="font-size:0.85rem; color:#718096; margin-top:4px;">${item.extension}</div>` : ''}
                        </div>
                    `;
                });
                html += `</div>`;
                wrongContainer.innerHTML = html;
            } else {
                wrongContainer.innerHTML = `
                    <div style="background:#f0fff4; border:1px solid #c6f6d5; color:#22543d; padding:15px; border-radius:10px; font-weight:bold; margin-top:15px;">
                        🌟 太神啦！本次測驗全部答對，沒有錯題！
                    </div>
                `;
            }
        }

        if (finalResultArea) {
            finalResultArea.style.display = 'block';
            finalResultArea.scrollIntoView({ behavior: 'smooth' });
        }
    }
}