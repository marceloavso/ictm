let players = JSON.parse(localStorage.getItem('chess_players')) || [];
let rounds = JSON.parse(localStorage.getItem('chess_rounds')) || [];
let tiebreaks = JSON.parse(localStorage.getItem('chess_tiebreaks')) || [];
let maxRounds = parseInt(localStorage.getItem('chess_maxRounds')) || 4;
let customMinutes = parseInt(localStorage.getItem('chess_minutes')) || 20;
let podiumConfirmed = JSON.parse(localStorage.getItem('chess_podiumConfirmed')) || false;

let currentPage = rounds.length > 0 ? rounds.length - 1 : 0;
let timerSeconds = customMinutes * 60;
let timerInterval = null;

// Inicialização
document.getElementById('maxRounds').value = maxRounds;
document.getElementById('customMinutes').value = customMinutes;
updateTimerDisplay();
renderPlayers();
renderTiebreaks();
updateUIState();

function saveData() {
    localStorage.setItem('chess_players', JSON.stringify(players));
    localStorage.setItem('chess_rounds', JSON.stringify(rounds));
    localStorage.setItem('chess_tiebreaks', JSON.stringify(tiebreaks));
    localStorage.setItem('chess_maxRounds', maxRounds);
    localStorage.setItem('chess_minutes', customMinutes);
    localStorage.setItem('chess_podiumConfirmed', JSON.stringify(podiumConfirmed));
}

// --- BACKUP E RESTAURAÇÃO EM ARQUIVO (.JSON) ---
function exportBackup() {
    const data = {
        version: '1.0',
        date: new Date().toISOString(),
        players,
        rounds,
        tiebreaks,
        maxRounds,
        customMinutes,
        podiumConfirmed
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-xadrez-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.players) || !Array.isArray(data.rounds)) {
                alert("Arquivo de backup inválido!");
                return;
            }
            if (!confirm("Isso substituirá os dados atuais do navegador pelos dados do arquivo de backup. Continuar?")) return;

            players = data.players;
            rounds = data.rounds;
            tiebreaks = data.tiebreaks || [];
            maxRounds = data.maxRounds || 4;
            customMinutes = data.customMinutes || 20;
            podiumConfirmed = !!data.podiumConfirmed;
            currentPage = rounds.length > 0 ? rounds.length - 1 : 0;

            document.getElementById('maxRounds').value = maxRounds;
            document.getElementById('customMinutes').value = customMinutes;
            resetTimer();
            saveData();
            renderPlayers();
            renderTiebreaks();
            updateUIState();
            alert("✅ Backup restaurado com sucesso!");
        } catch (err) {
            alert("Erro ao ler o arquivo de backup.");
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- MODO TELÃO / PROJETOR ---
function openProjectorMode() {
    document.getElementById('projectorOverlay').style.display = 'flex';
    renderProjectorContent();
}

function closeProjectorMode() {
    document.getElementById('projectorOverlay').style.display = 'none';
}

function renderProjectorContent() {
    const grid = document.getElementById('projectorMatchesGrid');
    const titleEl = document.getElementById('projRoundTitle');

    if (rounds.length === 0) {
        titleEl.innerText = 'Aguardando Sorteio da 1ª Rodada';
        grid.innerHTML = '<div style="font-size: 1.5rem; opacity: 0.7;">Os confrontos e mesas aparecerão aqui assim que o torneio iniciar.</div>';
        return;
    }

    const activeRound = rounds[currentPage];
    titleEl.innerText = activeRound.title;
    grid.innerHTML = '';

    let tableNum = 1;
    activeRound.matches.forEach(m => {
        if (m.white.id === 'BYE' || m.black.id === 'BYE') {
            grid.innerHTML += `
                <div class="proj-card" style="border-color: #27ae60;">
                    <div class="proj-table-num" style="background: #27ae60; color: white;">FOLGA (BYE)</div>
                    <div class="proj-player-row">😴 <strong>${m.white.name}</strong> (+1,0 pt)</div>
                </div>
            `;
        } else {
            const labelText = m.label ? ` • ${m.label}` : '';
            const statusText = m.result
                ? `<div style="margin-top: 10px; color: #2ecc71; font-weight: bold;">✔ Resultado: ${m.result === 'W' ? 'Brancas Venceram' : m.result === 'B' ? 'Pretas Venceram' : 'Empate'}</div>`
                : '';

            grid.innerHTML += `
                <div class="proj-card">
                    <div class="proj-table-num">🪑 MESA ${tableNum}${labelText}</div>
                    <div class="proj-player-row">
                        <span class="proj-piece white-p">Brancas</span>
                        <strong>${m.white.name}</strong>
                    </div>
                    <div class="proj-player-row">
                        <span class="proj-piece black-p" style="border: 1px solid #7f8c8d;">Pretas</span>
                        <strong>${m.black.name}</strong>
                    </div>
                    ${statusText}
                </div>
            `;
            tableNum++;
        }
    });
}

// --- CRONÔMETRO EDITÁVEL ---
function changeTimerDuration() {
    const val = parseInt(document.getElementById('customMinutes').value);
    if (val && val > 0) {
        customMinutes = val;
        saveData();
        resetTimer();
    }
}

function updateTimerDisplay() {
    let mins = Math.floor(timerSeconds / 60);
    let secs = timerSeconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('timer').innerText = formatted;
    const projTimer = document.getElementById('projTimer');
    if (projTimer) projTimer.innerText = formatted;
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();
        } else {
            pauseTimer();
            playBeep();
            alert("⏰ TEMPO ESGOTADO! Façam a contagem de peças para definir os vencedores.");
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    timerSeconds = customMinutes * 60;
    updateTimerDisplay();
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1);
    } catch (e) {}
}

// --- JOGADORES ---
function addPlayer() {
    if (rounds.length > 0) {
        alert("O torneio já começou! Reinicie o torneio se quiser alterar os participantes.");
        return;
    }
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    if (!name) return;
    players.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 4), name: name });
    input.value = '';
    saveData();
    renderPlayers();
}

function removePlayer(id) {
    if (rounds.length > 0) return;
    players = players.filter(p => p.id !== id);
    saveData();
    renderPlayers();
}

function renderPlayers() {
    const list = document.getElementById('playerList');
    list.innerHTML = '';
    players.forEach((p, idx) => {
        const delBtn = rounds.length === 0 ? `<button class="btn-red btn-sm" onclick="removePlayer('${p.id}')">X</button>` : '';
        list.innerHTML += `<li><span>${idx + 1}. ${p.name}</span> ${delBtn}</li>`;
    });
}

// --- ESTATÍSTICAS, CORES FIDE E DESEMPATES OFICIAIS ---
function getPlayerStats() {
    let stats = {};
    players.forEach((p, index) => {
        stats[p.id] = {
            id: p.id,
            name: p.name,
            seedIndex: index,
            pts: 0,
            buchholz: 0,
            played: 0,
            wins: 0,
            whites: 0,
            blacks: 0,
            colorHistory: [],
            opponents: [],
            hadBye: false,
            tiebreakBonus: 0
        };
    });

    rounds.filter(r => r.stage === 'swiss').forEach(r => {
        r.matches.forEach(m => {
            if (m.white.id === 'BYE' || m.black.id === 'BYE') {
                let realId = m.white.id === 'BYE' ? m.black.id : m.white.id;
                if (stats[realId]) {
                    stats[realId].hadBye = true;
                    if (m.result === 'BYE') {
                        stats[realId].pts += 1;
                        stats[realId].wins += 1;
                    }
                }
                return;
            }

            if (stats[m.white.id] && stats[m.black.id]) {
                stats[m.white.id].whites++;
                stats[m.black.id].blacks++;
                stats[m.white.id].colorHistory.push('W');
                stats[m.black.id].colorHistory.push('B');
                stats[m.white.id].opponents.push(m.black.id);
                stats[m.black.id].opponents.push(m.white.id);

                if (m.result) {
                    stats[m.white.id].played++;
                    stats[m.black.id].played++;

                    if (m.result === 'W') {
                        stats[m.white.id].pts += 1;
                        stats[m.white.id].wins += 1;
                    } else if (m.result === 'B') {
                        stats[m.black.id].pts += 1;
stats[m.black.id].wins += 1;
} else if (m.result === 'D') {
stats[m.white.id].pts += 0.5;
stats[m.black.id].pts += 0.5;
}
}
}
});
});
Object.values(stats).forEach(s => {
let sum = 0;
s.opponents.forEach(oppId => {
if (stats[oppId]) sum += stats[oppId].pts;
});
s.buchholz = sum;
});
tiebreaks.forEach(tb => {
if (tb.result === 'W' && stats[tb.white.id]) {
stats[tb.white.id].tiebreakBonus += 1;
} else if (tb.result === 'B' && stats[tb.black.id]) {
stats[tb.black.id].tiebreakBonus += 1;
}
});
function getHeadToHeadWinner(idA, idB) {
for (let r of rounds.filter(rd => rd.stage === 'swiss')) {
for (let m of r.matches) {
if (m.white.id === idA && m.black.id === idB) {
if (m.result === 'W') return idA;
if (m.result === 'B') return idB;
}
if (m.white.id === idB && m.black.id === idA) {
if (m.result === 'W') return idB;
if (m.result === 'B') return idA;
}
}
}
return null;
}
return Object.values(stats).sort((a, b) => {
if (b.pts !== a.pts) return b.pts - a.pts;
if (b.tiebreakBonus !== a.tiebreakBonus) return b.tiebreakBonus - a.tiebreakBonus;
const h2h = getHeadToHeadWinner(a.id, b.id);
if (h2h === a.id) return -1;
if (h2h === b.id) return 1;
if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
if (b.wins !== a.wins) return b.wins - a.wins;
return a.seedIndex - b.seedIndex;
});
}
// --- REGRAS DE CORES FIDE ---
function wouldViolateThreeInARow(stat, nextColor) {
const h = stat.colorHistory;
if (h.length < 2) return false;
return h[h.length - 1] === nextColor && h[h.length - 2] === nextColor;
}
function getDueColor(stat) {
const h = stat.colorHistory;
if (h.length === 0) return null;
const last = h[h.length - 1];
return last === 'W' ? 'B' : 'W';
}
function assignFideColors(p1, p2) {
const p1CanW = !wouldViolateThreeInARow(p1, 'W');
const p1CanB = !wouldViolateThreeInARow(p1, 'B');
const p2CanW = !wouldViolateThreeInARow(p2, 'W');
const p2CanB = !wouldViolateThreeInARow(p2, 'B');
const opt1Valid = p1CanW && p2CanB;
const opt2Valid = p2CanW && p1CanB;
if (opt1Valid && !opt2Valid) return { white: p1, black: p2 };
if (opt2Valid && !opt1Valid) return { white: p2, black: p1 };
const p1Balance = p1.whites - p1.blacks;
const p2Balance = p2.whites - p2.blacks;
if (p1Balance < p2Balance) return { white: p1, black: p2 };
if (p2Balance < p1Balance) return { white: p2, black: p1 };
const p1Due = getDueColor(p1);
const p2Due = getDueColor(p2);
if (p1Due === 'W' && p2Due === 'B') return { white: p1, black: p2 };
if (p2Due === 'W' && p1Due === 'B') return { white: p2, black: p1 };
return Math.random() < 0.5 ? { white: p1, black: p2 } : { white: p2, black: p1 };
}
// --- BACKTRACKING SEM REPETIÇÕES E COM EQUILÍBRIO FIDE ---
function findValidPairing(pool, strictColors = true) {
if (pool.length === 0) return [];
const p1 = pool[0];
let candidates = [];
for (let i = 1; i < pool.length; i++) {
const p2 = pool[i];
if (p1.opponents.includes(p2.id)) continue;
const colors = assignFideColors(p1, p2);
const wOk = !wouldViolateThreeInARow(colors.white, 'W');
const bOk = !wouldViolateThreeInARow(colors.black, 'B');
if (strictColors && (!wOk || !bOk)) continue;
const dueMatch = (getDueColor(p1) !== getDueColor(p2)) ? 1 : 0;
candidates.push({ index: i, p2, dueMatch });
}
candidates.sort((a, b) => b.dueMatch - a.dueMatch);
for (let cand of candidates) {
const remaining = pool.filter((_, idx) => idx !== 0 && idx !== cand.index);
const subResult = findValidPairing(remaining, strictColors);
if (subResult !== null) {
return [[p1, cand.p2], ...subResult];
}
}
return null;
}
// --- INICIAR E GERAR RODADAS (1ª FASE) ---
function startTournament() {
if (players.length < 4) {
alert("Adicione pelo menos 4 alunos para realizar o torneio com Semifinais!");
return;
}
maxRounds = parseInt(document.getElementById('maxRounds').value) || 4;
const maxPossibleUnique = players.length % 2 === 0 ? players.length - 1 : players.length;
if (maxRounds > maxPossibleUnique) {
if (!confirm(`Com ${players.length} alunos, o máximo de rodadas sem repetir adversários é ${maxPossibleUnique}. Deseja continuar mesmo assim?`)) {
return;
}
}
let shuffled = [...players].sort(() => Math.random() - 0.5);
let matches = [];
if (shuffled.length % 2 !== 0) {
let byePlayer = shuffled.pop();
matches.push({
id: 'r1_bye',
white: byePlayer,
black: { id: 'BYE', name: 'FOLGA' },
result: 'BYE'
});
}
for (let i = 0; i < shuffled.length; i += 2) {
matches.push({
id: `r1_m${i}`,
white: shuffled[i],
black: shuffled[i + 1],
result: null
});
}
rounds = [{ roundNum: 1, stage: 'swiss', title: '1ª Fase - Rodada 1 (Sorteio)', matches: matches }];
podiumConfirmed = false;
currentPage = 0;
saveData();
renderPlayers();
updateUIState();
}
function generateNextSwissRound() {
const currentRound = rounds[rounds.length - 1];
if (currentRound.matches.some(m => !m.result)) {
alert("Finalize todos os resultados da rodada atual antes de parear a próxima!");
return;
}
let sortedStats = getPlayerStats();
let matches = [];
let pool = [...sortedStats];
if (pool.length % 2 !== 0) {
let byeIndex = -1;
for (let i = pool.length - 1; i >= 0; i--) {
if (!pool[i].hadBye) { byeIndex = i; break; }
}
if (byeIndex === -1) byeIndex = pool.length - 1;
let byePlayer = pool.splice(byeIndex, 1)[0];
matches.push({
id: `r${rounds.length + 1}_bye`,
white: { id: byePlayer.id, name: byePlayer.name },
black: { id: 'BYE', name: 'FOLGA' },
result: 'BYE'
});
}
let paired = findValidPairing(pool, true);
if (!paired) {
paired = findValidPairing(pool, false);
}
if (paired) {
paired.forEach((pair, idx) => {
const colors = assignFideColors(pair[0], pair[1]);
matches.push({
id: `r${rounds.length + 1}_m${idx}`,
white: { id: colors.white.id, name: colors.white.name },
black: { id: colors.black.id, name: colors.black.name },
result: null
});
});
} else {
while (pool.length >= 2) {
let p1 = pool.shift();
let p2 = pool.shift();
const colors = assignFideColors(p1, p2);
matches.push({
id: `r${rounds.length + 1}_m${matches.length}`,
white: { id: colors.white.id, name: colors.white.name },
black: { id: colors.black.id, name: colors.black.name },
result: null
});
}
}
const nextNum = rounds.length + 1;
rounds.push({
roundNum: nextNum,
stage: 'swiss',
title: `1ª Fase - Rodada ${nextNum} (Pareamento)`,
matches: matches
});
currentPage = rounds.length - 1;
saveData();
updateUIState();
}
// --- MATA-MATA COM CONFIRMAÇÃO MANUAL ---
function generateSemifinals() {
const currentRound = rounds[rounds.length - 1];
if (currentRound.matches.some(m => !m.result)) {
alert("Finalize todas as partidas da última rodada antes de gerar as semifinais!");
return;
}
const top4 = getPlayerStats().slice(0, 4);
const semiMatches = [
{
id: 'semi_1',
label: 'Semifinal 1 (1º x 4º)',
white: { id: top4[0].id, name: top4[0].name },
black: { id: top4[3].id, name: top4[3].name },
result: null
},
{
id: 'semi_2',
label: 'Semifinal 2 (2º x 3º)',
white: { id: top4[1].id, name: top4[1].name },
black: { id: top4[2].id, name: top4[2].name },
result: null
}
];
rounds.push({
roundNum: rounds.length + 1,
stage: 'semifinal',
title: '🔥 Semifinais (Top 4)',
matches: semiMatches
});
currentPage = rounds.length - 1;
saveData();
updateUIState();
}
function confirmAndGenerateFinals() {
const semiRound = rounds.find(r => r.stage === 'semifinal');
if (!semiRound) return;
const m1 = semiRound.matches[0];
const m2 = semiRound.matches[1];
if (!m1.result || !m2.result || m1.result === 'D' || m2.result === 'D') {
alert("Selecione os vencedores das duas semifinais antes de avançar!");
return;
}
const w1 = m1.result === 'W' ? m1.white : m1.black;
const l1 = m1.result === 'W' ? m1.black : m1.white;
const w2 = m2.result === 'W' ? m2.white : m2.black;
const l2 = m2.result === 'W' ? m2.black : m2.white;
const stats = getPlayerStats();
const sW1 = stats.find(s => s.id === w1.id);
const sW2 = stats.find(s => s.id === w2.id);
const sL1 = stats.find(s => s.id === l1.id);
const sL2 = stats.find(s => s.id === l2.id);
const finalColors = assignFideColors(sW1, sW2);
const thirdColors = assignFideColors(sL1, sL2);
rounds.push({
roundNum: rounds.length + 1,
stage: 'final',
title: '🏆 Grande Final e Disputa de 3º Lugar',
matches: [
{ id: 'final_match', label: '🥇 GRANDE FINAL', white: { id: finalColors.white.id, name: finalColors.white.name }, black: { id: finalColors.black.id, name: finalColors.black.name }, result: null },
{ id: 'third_match', label: '🥉 Disputa de 3º Lugar', white: { id: thirdColors.white.id, name: thirdColors.white.name }, black: { id: thirdColors.black.id, name: thirdColors.black.name }, result: null }
]
});
currentPage = rounds.length - 1;
saveData();
updateUIState();
}
function confirmPodium() {
const finalRound = rounds.find(r => r.stage === 'final');
if (!finalRound || finalRound.matches.some(m => !m.result)) {
alert("Selecione os vencedores da Grande Final e da Disputa de 3º Lugar antes de confirmar o pódio!");
return;
}
podiumConfirmed = true;
saveData();
updateUIState();
}
function setResult(rIdx, mIdx, res) {
const round = rounds[rIdx];
if ((round.stage === 'semifinal' || round.stage === 'final') && res === 'D') {
alert("No mata-mata não pode haver empate! Façam um desempate relâmpago (Blitz 5 min) ou contagem de peças para definir quem vence.");
return;
}
if (round.stage === 'semifinal' && rounds.some(r => r.stage === 'final')) {
if (!confirm("A Final já foi gerada. Alterar o vencedor da semifinal irá desfazer a Final atual para que você confirme novamente. Continuar?")) {
return;
}
rounds = rounds.filter(r => r.stage !== 'final');
podiumConfirmed = false;
}
if (round.stage === 'final' && podiumConfirmed) {
podiumConfirmed = false;
}
round.matches[mIdx].result = res;
saveData();
updateUIState();
}
// --- PAGINAÇÃO ---
function changePage(delta) {
const newPage = currentPage + delta;
if (newPage >= 0 && newPage < rounds.length) {
currentPage = newPage;
renderRounds();
if (document.getElementById('projectorOverlay').style.display === 'flex') {
renderProjectorContent();
}
}
}
// --- GERENCIADOR DE DESEMPATES EXTRAS ---
function openTiebreakModal() {
if (players.length < 2) {
alert("Cadastre pelo menos 2 alunos primeiro.");
return;
}
const sel1 = document.getElementById('tbPlayer1');
const sel2 = document.getElementById('tbPlayer2');
sel1.innerHTML = '';
sel2.innerHTML = '';
const ordered = rounds.length > 0 ? getPlayerStats() : players;
ordered.forEach(p => {
sel1.innerHTML += `<option value="${p.id}">${p.name}</option>`;
sel2.innerHTML += `<option value="${p.id}">${p.name}</option>`;
});
if (ordered.length > 1) sel2.selectedIndex = 1;
document.getElementById('tbTitle').value = 'Desempate Extra (Blitz 5 min)';
document.getElementById('tiebreakModal').style.display = 'flex';
}
function closeTiebreakModal() {
document.getElementById('tiebreakModal').style.display = 'none';
}
function createTiebreakMatch() {
const title = document.getElementById('tbTitle').value.trim() || 'Desempate';
const id1 = document.getElementById('tbPlayer1').value;
const id2 = document.getElementById('tbPlayer2').value;
if (id1 === id2) {
alert("Selecione dois alunos diferentes!");
return;
}
const p1 = players.find(p => p.id === id1);
const p2 = players.find(p => p.id === id2);
tiebreaks.push({
id: Date.now().toString(),
title: title,
white: p1,
black: p2,
result: null
});
closeTiebreakModal();
saveData();
renderTiebreaks();
}
function setTiebreakResult(idx, res) {
tiebreaks[idx].result = res;
saveData();
renderTiebreaks();
updateUIState();
}
function removeTiebreak(idx) {
tiebreaks.splice(idx, 1);
saveData();
renderTiebreaks();
updateUIState();
}
function renderTiebreaks() {
const container = document.getElementById('tiebreaksList');
if (tiebreaks.length === 0) {
container.innerHTML = 'Nenhuma partida de desempate registrada.';
return;
}
container.innerHTML = '';
tiebreaks.forEach((tb, idx) => {
container.innerHTML += `<div class="match" style="background: #fff8f0; border-color: #f39c12; flex-direction: column; align-items: stretch;">
    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; color: #d35400;">
        <span>⚡ ${tb.title}</span>
        <button class="btn-red btn-sm" style="padding: 2px 6px;" onclick="removeTiebreak(${idx})">X</button>
    </div>
    <div class="match-players" style="font-size: 0.9rem;">
        <span class="badge white-p">Brancas</span> ${tb.white.name}<br>
        <span class="badge black-p">Pretas</span> ${tb.black.name}
    </div>
    <div class="match-actions">
        <button class="btn-blue btn-sm ${tb.result === 'W' ? 'active-btn' : ''}" onclick="setTiebreakResult(${idx}, 'W')">Brancas Vencem</button>
        <button class="btn-dark btn-sm ${tb.result === 'B' ? 'active-btn' : ''}" onclick="setTiebreakResult(${idx}, 'B')">Pretas Vencem</button>
    </div>
</div>`;
});
}
// --- ATUALIZAÇÃO DA INTERFACE ---
function updateUIState() {
const statusBadge = document.getElementById('tournamentStatus');
const btnStart = document.getElementById('btnStart');
const btnNext = document.getElementById('btnNextRound');
const btnSemi = document.getElementById('btnSemifinals');
const btnFinals = document.getElementById('btnFinals');
const btnConfirmPodium = document.getElementById('btnConfirmPodium');
document.getElementById('maxRounds').disabled = rounds.length > 0;
btnStart.style.display = 'none';
btnNext.style.display = 'none';
btnSemi.style.display = 'none';
btnFinals.style.display = 'none';
btnConfirmPodium.style.display = 'none';
if (rounds.length === 0) {
statusBadge.innerText = '📍 Aguardando Início';
btnStart.style.display = 'block';
} else {
const lastRound = rounds[rounds.length - 1];
const allFinished = lastRound.matches.every(m => m.result !== null);
if (lastRound.stage === 'swiss') {
statusBadge.innerText = `📍 1ª Fase: Rodada ${lastRound.roundNum} de ${maxRounds}`;
if (lastRound.roundNum < maxRounds) {
btnNext.style.display = 'block';
} else {
btnSemi.style.display = 'block';
}
} else if (lastRound.stage === 'semifinal') {
statusBadge.innerText = '🔥 Fase Final: Semifinais';
if (allFinished) {
btnFinals.style.display = 'block';
}
} else if (lastRound.stage === 'final') {
if (podiumConfirmed) {
statusBadge.innerText = '🏁 Torneio Finalizado!';
} else {
statusBadge.innerText = '🏆 Fase Final: Decisão';
if (allFinished) {
btnConfirmPodium.style.display = 'block';
}
}
}
}
renderStandings();
renderRounds();
renderPodium();
if (document.getElementById('projectorOverlay').style.display === 'flex') {
renderProjectorContent();
}
}
function renderStandings() {
const tbody = document.getElementById('standingsBody');
if (players.length === 0) {
tbody.innerHTML = 'Adicione alunos e sorteie a 1ª rodada';
return;
}
const sorted = getPlayerStats();
tbody.innerHTML = '';
sorted.forEach((s, idx) => {
const isTop4 = idx < 4;
const rowClass = isTop4 ? 'top4-row' : '';
const top4Badge = isTop4 ? 'Top 4' : '';
const tbBadge = s.tiebreakBonus > 0 ? '<span class="tb-badge">⚡ Desempate</span>' : '';
let colorChips = s.colorHistory.map(c =>
`<span class="color-chip chip-${c}" title="${c === 'W' ? 'Brancas' : 'Pretas'}">${c === 'W' ? 'B' : 'P'}</span>`
).join('');
if (!colorChips) colorChips = '-';
tbody.innerHTML += `
<tr class="${rowClass}">
    <td>${idx + 1}º</td>
    <td><strong>${s.name}</strong>${top4Badge ? ` <span class="top4-badge">${top4Badge}</span>` : ''} ${tbBadge}</td>
    <td>${s.pts}</td>
    <td>${s.buchholz}</td>
    <td>${s.wins}</td>
    <td>${s.played}</td>
    <td>${colorChips}</td>
</tr>`;
});
}
function renderRounds() {
const container = document.getElementById('roundsContainer');
const pagControls = document.getElementById('paginationControls');
if (rounds.length === 0) {
container.innerHTML = 'Os confrontos aparecerão aqui.';
pagControls.style.display = 'none';
return;
}
pagControls.style.display = 'flex';
document.getElementById('pageIndicator').innerText = `Página ${currentPage + 1} de ${rounds.length}`;
document.getElementById('btnPrevPage').disabled = (currentPage === 0);
document.getElementById('btnNextPage').disabled = (currentPage === rounds.length - 1);
container.innerHTML = '';
rounds.forEach((r, rIdx) => {
const isVisible = (rIdx === currentPage);
const isLatest = (rIdx === rounds.length - 1);
const allFinished = r.matches.every(m => m.result !== null);
let boxClass = 'round-box';
if (r.stage === 'semifinal' || r.stage === 'final') boxClass += ' knockout-round';
else if (isLatest) boxClass += ' active-round';
const statusLabel = isLatest ? '🟢 Rodada Atual' : '✔️ Concluída';
const displayStyle = isVisible ? 'display: block;' : 'display: none;';
let html = `<div class="${boxClass}" style="${displayStyle}">
    <div class="round-title">
        <span>${r.title}</span>
        <small style="font-size: 0.8rem; color: #555;">${statusLabel}</small>
    </div>`;
let tableCounter = 1;
r.matches.forEach((m, mIdx) => {
if (m.white.id === 'BYE' || m.black.id === 'BYE') {
html += `<div class="match" style="background:#eef2f5; color:#555;"><span>😴 <strong>${m.white.name}</strong> recebeu folga (+1,0 pt)</span></div>`;
} else {
const labelSpan = m.label ? `<span style="font-size:0.8rem; font-weight:bold; color:#8e44ad;">${m.label}</span>` : '';
const drawBtn = r.stage === 'swiss'
? `<button class="btn-orange btn-sm ${m.result === 'D' ? 'active-btn' : ''}" onclick="setResult(${rIdx}, ${mIdx}, 'D')">Empate</button>`
: '';
html += `<div class="match">
    <div class="match-header-bar"><span class="table-badge">🪑 Mesa ${tableCounter}</span> ${labelSpan}</div>
    <div class="match-players">
        <span class="badge white-p">Brancas</span> ${m.white.name}<br>
        <span class="badge black-p">Pretas</span> ${m.black.name}
    </div>
    <div class="match-actions">
        <button class="btn-blue btn-sm ${m.result === 'W' ? 'active-btn' : ''}" onclick="setResult(${rIdx}, ${mIdx}, 'W')">Brancas Vencem</button>
        ${drawBtn}
        <button class="btn-dark btn-sm ${m.result === 'B' ? 'active-btn' : ''}" onclick="setResult(${rIdx}, ${mIdx}, 'B')">Pretas Vencem</button>
    </div>
</div>`;
tableCounter++;
}
});
// Botões de confirmação manual nas fases eliminatórias
if (r.stage === 'semifinal' && isLatest && allFinished) {
html += `<div class="confirm-box"><button class="btn-purple" onclick="confirmAndGenerateFinals()">✅ Confirmar Vencedores e Gerar Final ➔</button></div>`;
} else if (r.stage === 'final' && isLatest && allFinished && !podiumConfirmed) {
html += `<div class="confirm-box"><button class="btn-green" onclick="confirmPodium()">✅ Confirmar Vencedores e Exibir Pódio ➔</button></div>`;
}
html += '</div>';
container.innerHTML += html;
});
}
function renderPodium() {
const banner = document.getElementById('podiumBanner');
const finalRound = rounds.find(r => r.stage === 'final');
if (!finalRound || !podiumConfirmed || finalRound.matches.some(m => !m.result)) {
banner.style.display = 'none';
return;
}
const fMatch = finalRound.matches[0];
const tMatch = finalRound.matches[1];
const champion = fMatch.result === 'W' ? fMatch.white.name : fMatch.black.name;
const runnerUp = fMatch.result === 'W' ? fMatch.black.name : fMatch.white.name;
const thirdPlace = tMatch.result === 'W' ? tMatch.white.name : tMatch.black.name;
banner.style.display = 'block';
banner.innerHTML = `
<h2 style="margin: 0; color: #f1c40f;">🏆 Pódio Oficial do Interclasses</h2>
<div class="podium-grid">
    <div class="podium-place" style="border: 2px solid #f1c40f;">
        <div style="font-size: 1.5rem;">🥇 1º Lugar</div>
        <strong>${champion}</strong>
    </div>
    <div class="podium-place">
        <div style="font-size: 1.5rem;">🥈 2º Lugar</div>
        <strong>${runnerUp}</strong>
    </div>
    <div class="podium-place">
        <div style="font-size: 1.5rem;">🥉 3º Lugar</div>
        <strong>${thirdPlace}</strong>
    </div>
</div>`;
}
// --- CALCULADORA DE PEÇAS ---
function calcPieces() {
const w = (document.getElementById('wQ').value * 9) +
(document.getElementById('wR').value * 5) +
(document.getElementById('wB').value * 3) +
(document.getElementById('wN').value * 3) +
(document.getElementById('wP').value * 1);
const b = (document.getElementById('bQ').value * 9) +
(document.getElementById('bR').value * 5) +
(document.getElementById('bB').value * 3) +
(document.getElementById('bN').value * 3) +
(document.getElementById('bP').value * 1);
document.getElementById('wTotal').innerText = `${w} pts`;
document.getElementById('bTotal').innerText = `${b} pts`;
}
function resetCalc() {
['wQ', 'wR', 'wB', 'wN', 'wP', 'bQ', 'bR', 'bB', 'bN', 'bP'].forEach(id => {
document.getElementById(id).value = 0;
});
calcPieces();
}
function resetAll() {
if (confirm("Tem certeza que deseja apagar todos os alunos, rodadas e desempates?")) {
players = [];
rounds = [];
tiebreaks = [];
podiumConfirmed = false;
currentPage = 0;
saveData();
renderPlayers();
renderTiebreaks();
updateUIState();
}
}