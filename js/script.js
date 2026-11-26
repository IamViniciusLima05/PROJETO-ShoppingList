/* ShoppingList — várias listas, seções automáticas, preços em centavos e orçamento */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const paraCentavos = (t) => { if (t == null || String(t).trim() === '') return 0; const v = parseFloat(String(t).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(v) ? Math.round(v * 100) : 0; };
const fmtQtd = (q) => q.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const SECOES = [
  ['hort', '🥬 Hortifrúti', 'alface tomate cebola alho batata cenoura banana maca laranja limao mamao abacate uva morango pera abobrinha brocolis couve pimentao cheiro salsinha cebolinha fruta verdura legume melancia manga abacaxi chuchu beterraba mandioca aipim'],
  ['acou', '🥩 Açougue e peixaria', 'carne frango peixe linguica bacon picanha alcatra patinho costela file peito coxa sobrecoxa salsicha hamburguer tilapia salmao camarao moida'],
  ['frios', '🧀 Frios e laticínios', 'leite queijo presunto iogurte manteiga margarina requeijao mussarela creme nata ovo ovos'],
  ['pad', '🥖 Padaria', 'pao paes bolo torrada bisnaguinha croissant sonho cuca'],
  ['merc', '🥫 Mercearia', 'arroz feijao macarrao massa farinha acucar sal oleo azeite cafe molho extrato milho ervilha atum sardinha biscoito bolacha cereal aveia granola chocolate achocolatado tempero vinagre maionese ketchup mostarda fermento gelatina leite condensado'],
  ['beb', '🥤 Bebidas', 'agua refrigerante suco cerveja vinho cha energetico'],
  ['limp', '🧽 Limpeza', 'detergente sabao amaciante desinfetante agua sanitaria esponja vassoura saco lixo multiuso alcool papel toalha'],
  ['hig', '🧴 Higiene', 'sabonete shampoo condicionador pasta dente escova desodorante papel higienico absorvente fralda fio dental creme'],
  ['outros', '📦 Outros', '']
];
const NOMES_SEC = Object.fromEntries(SECOES.map(([k, n]) => [k, n]));
function secaoDe(nome) {
  const n = sem(nome);
  if (/papel higienico/.test(n)) return 'hig';
  if (/agua sanitaria|papel toalha/.test(n)) return 'limp';
  if (/creme de leite|leite condensado/.test(n)) return n.includes('condensado') ? 'merc' : 'frios';
  for (const [k, , pal] of SECOES) if (pal && pal.split(' ').some((p) => new RegExp(`\\b${p}`).test(n))) return k;
  return 'outros';
}
// "2 kg arroz 25,90" → qtd 2, kg, arroz, R$ 25,90
function interpretar(txt) {
  let t = txt.trim().replace(/\s+/g, ' '), qtd = 1, un = 'un', preco = 0;
  const mp = t.match(/\s(?:r\$\s?)?(\d+[.,]\d{2})$/i); if (mp) { preco = paraCentavos(mp[1]); t = t.slice(0, mp.index).trim(); }
  const mq = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|pct|cx|dz|x)?\s+(?:de\s+)?/i);
  if (mq) { qtd = parseFloat(mq[1].replace(',', '.')); if (mq[2] && mq[2].toLowerCase() !== 'x') un = mq[2].toLowerCase() === 'l' ? 'L' : mq[2].toLowerCase(); t = t.slice(mq[0].length); }
  const nome = t.charAt(0).toUpperCase() + t.slice(1);
  return { id: uid(), nome, qtd, un, preco, sec: secaoDe(nome), obs: '', pego: false };
}

function exemplo() {
  const itens = ['2 kg arroz 27,90', '1 kg feijão 8,49', '12 ovos 0,95', 'Leite integral 5,29', '1 kg banana 6,99', 'Tomate', '500 g café 18,90', 'Detergente 2,79', 'Pão francês'].map(interpretar);
  itens[2].un = 'un'; itens[3].qtd = 6; itens[8].obs = '10 unidades'; itens[0].pego = true; itens[6].pego = true;
  return { atual: 'l1', listas: [{ id: 'l1', nome: 'Mercado da semana', orc: 25000, itens }, { id: 'l2', nome: 'Churrasco de domingo', orc: 0, itens: ['2 kg picanha 79,90', '1 kg linguiça 24,90', 'Carvão', '12 cerveja 4,49', 'Pão de alho'].map(interpretar) }] };
}
let dados = banco.ler('sl_dados', null);
if (!dados?.listas?.length) dados = exemplo();
let ver = 'todos';
const salvar = () => banco.salvar('sl_dados', dados);
const lista = () => dados.listas.find((l) => l.id === dados.atual) || dados.listas[0];
// em g e ml o preço digitado é o da embalagem; nas outras unidades é por unidade (ou por kg/L)
const porPacote = (i) => i.un === 'g' || i.un === 'ml';
const totalItem = (i) => (porPacote(i) ? i.preco : Math.round(i.preco * i.qtd));

/* ---------- Render ---------- */
function render() {
  const l = lista(); dados.atual = l.id;
  $('#listas').innerHTML = dados.listas.map((x) => `<option value="${x.id}"${x.id === l.id ? ' selected' : ''}>${escapar(x.nome)} (${x.itens.filter((i) => !i.pego).length})</option>`).join('');
  const total = l.itens.reduce((s, i) => s + totalItem(i), 0), noCarrinho = l.itens.filter((i) => i.pego).reduce((s, i) => s + totalItem(i), 0);
  const pegos = l.itens.filter((i) => i.pego).length, semPreco = l.itens.filter((i) => !i.preco).length;
  $('#r-itens').textContent = `${pegos}/${l.itens.length}`; $('#r-total').textContent = brl(total); $('#r-carrinho').textContent = brl(noCarrinho);
  $('#orc-box').hidden = !l.orc;
  if (l.orc) {
    const pct = Math.min(100, (total / l.orc) * 100), est = total > l.orc;
    $('#orc-barra').style.width = pct + '%'; $('#orc-box').classList.toggle('estourou', est);
    $('#orc-txt').textContent = est ? `${brl(total - l.orc)} acima do orçamento` : `Sobram ${brl(l.orc - total)} de ${brl(l.orc)}`;
  }
  const filtrados = l.itens.filter((i) => ver === 'todos' || (ver === 'falta' ? !i.pego : i.pego));
  // agrupa por seção, na ordem do mercado; itens pegos vão para o fim da seção
  $('#secoes').innerHTML = SECOES.map(([k, nome]) => {
    const its = filtrados.filter((i) => i.sec === k).sort((a, b) => a.pego - b.pego);
    if (!its.length) return '';
    const sub = its.reduce((s, i) => s + totalItem(i), 0);
    return `<section class="secao"><h2><span>${nome}</span><span>${sub ? brl(sub) : ''}</span></h2><ul class="itens">${its.map((i) => `
      <li class="item${i.pego ? ' pego' : ''}" data-id="${i.id}">
        <button class="check" data-check aria-label="${i.pego ? 'Desmarcar' : 'Marcar'} ${escapar(i.nome)}" aria-pressed="${i.pego}">✓</button>
        <div class="item__info" data-editar><span class="item__nome">${escapar(i.nome)}</span><span class="item__sub">${[i.un === 'un' ? '' : fmtQtd(i.qtd) + ' ' + i.un, i.preco && !porPacote(i) ? `${brl(i.preco)}/${i.un}` : '', escapar(i.obs)].filter(Boolean).join(' · ')}</span></div>
        ${i.un === 'un' ? `<div class="qtd"><button data-menos aria-label="Menos">−</button><span>${fmtQtd(i.qtd)}</span><button data-mais aria-label="Mais">+</button></div>` : '<span></span>'}
        <span class="preco${i.preco ? '' : ' sem'}">${i.preco ? brl(totalItem(i)) : 'sem preço'}</span>
      </li>`).join('')}</ul></section>`;
  }).join('');
  $('#vazio').hidden = filtrados.length > 0;
  $('#vazio p').textContent = l.itens.length ? (ver === 'falta' ? '🎉 Pegou tudo!' : 'Nenhum item no carrinho ainda.') : 'Lista vazia. Adicione o primeiro item acima.';
  $$('[data-ver]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ver === ver));
  $('#r-total').title = semPreco ? `${semPreco} itens sem preço não entram no total` : '';
  const hist = banco.ler('sl_hist', []);
  $('#historico').innerHTML = hist.map((h) => `<option value="${escapar(h)}">`).join('');
  salvar();
}

/* ---------- Itens ---------- */
$('#form-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#novo').value.trim(); if (!v) return;
  const it = interpretar(v), l = lista();
  const igual = l.itens.find((i) => sem(i.nome) === sem(it.nome) && i.un === it.un);
  if (igual) { igual.qtd += it.qtd; igual.pego = false; if (it.preco) igual.preco = it.preco; toast(`${igual.nome}: quantidade somada`); }
  else l.itens.push(it);
  const hist = [it.nome, ...banco.ler('sl_hist', []).filter((h) => sem(h) !== sem(it.nome))].slice(0, 60); banco.salvar('sl_hist', hist);
  $('#novo').value = ''; render();
});
$('#secoes').addEventListener('click', (e) => {
  const li = e.target.closest('.item'); if (!li) return;
  const l = lista(), it = l.itens.find((i) => i.id === li.dataset.id);
  if (e.target.closest('[data-check]')) { it.pego = !it.pego; vibrar(10); render(); return; }
  if (e.target.closest('[data-mais]')) { it.qtd += 1; render(); return; }
  if (e.target.closest('[data-menos]')) { if (it.qtd > 1) { it.qtd -= 1; render(); } return; }
  if (e.target.closest('[data-editar]')) abrirItem(it);
});

const dlgI = $('#dlg-item');
let editando = null;
$('#i-sec').innerHTML = SECOES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
function abrirItem(it) {
  editando = it;
  $('#i-nome').value = it.nome; $('#i-qtd').value = fmtQtd(it.qtd); $('#i-un').value = it.un; $('#i-preco').value = it.preco ? (it.preco / 100).toFixed(2).replace('.', ',') : '';
  $('#i-sec').value = it.sec; $('#i-obs').value = it.obs; resetBtn($('#i-excluir'), 'Excluir');
  dlgI.returnValue = ''; dlgI.showModal();
}
dlgI.addEventListener('close', () => {
  if (dlgI.returnValue !== 'salvar' || !editando) return;
  Object.assign(editando, { nome: $('#i-nome').value.trim() || editando.nome, qtd: Math.max(0.001, parseFloat($('#i-qtd').value.replace(/\./g, '').replace(',', '.')) || 1), un: $('#i-un').value, preco: paraCentavos($('#i-preco').value), sec: $('#i-sec').value, obs: $('#i-obs').value.trim() });
  render();
});
$('#i-excluir').addEventListener('click', (e) => {
  if (!confirmar(e.currentTarget, 'Excluir')) return;
  const l = lista(), idx = l.itens.indexOf(editando), it = editando;
  l.itens.splice(idx, 1); dlgI.close('excluir'); render();
  toast(`${it.nome} removido`, () => { l.itens.splice(idx, 0, it); render(); });
});

/* ---------- Listas ---------- */
const dlgL = $('#dlg-lista');
$('#listas').addEventListener('change', (e) => { dados.atual = e.target.value; ver = 'todos'; render(); });
$('#menu-lista').addEventListener('click', () => {
  const l = lista(); $('#l-nome').value = l.nome; $('#l-orc').value = l.orc ? (l.orc / 100).toFixed(2).replace('.', ',') : '';
  resetBtn($('#l-excluir'), 'Excluir lista'); $('#l-excluir').disabled = dados.listas.length < 2;
  dlgL.returnValue = ''; dlgL.showModal();
});
dlgL.addEventListener('close', () => { if (dlgL.returnValue !== 'salvar') return; const l = lista(); l.nome = $('#l-nome').value.trim() || l.nome; l.orc = paraCentavos($('#l-orc').value); render(); });
$('#l-nova').addEventListener('click', () => { const l = { id: uid(), nome: `Lista ${dados.listas.length + 1}`, orc: 0, itens: [] }; dados.listas.push(l); dados.atual = l.id; dlgL.close('nova'); render(); $('#menu-lista').click(); $('#l-nome').select(); });
$('#l-duplicar').addEventListener('click', () => { const o = lista(); const l = { ...JSON.parse(JSON.stringify(o)), id: uid(), nome: o.nome + ' (cópia)' }; l.itens.forEach((i) => { i.id = uid(); i.pego = false; }); dados.listas.push(l); dados.atual = l.id; dlgL.close('dup'); render(); toast('Lista duplicada, com tudo desmarcado'); });
$('#l-desmarcar').addEventListener('click', () => { lista().itens.forEach((i) => { i.pego = false; }); dlgL.close('desm'); render(); toast('Todos os itens desmarcados'); });
$('#l-excluir').addEventListener('click', (e) => {
  if (dados.listas.length < 2 || !confirmar(e.currentTarget, 'Excluir lista')) return;
  const l = lista(), idx = dados.listas.indexOf(l); dados.listas.splice(idx, 1); dados.atual = dados.listas[0].id; dlgL.close('excluir'); render();
  toast(`"${l.nome}" excluída`, () => { dados.listas.splice(idx, 0, l); dados.atual = l.id; render(); });
});

/* ---------- Compartilhar ---------- */
function textoLista() {
  const l = lista(), falta = l.itens.filter((i) => !i.pego);
  const linhas = SECOES.flatMap(([k, n]) => { const its = falta.filter((i) => i.sec === k); return its.length ? [`*${n}*`, ...its.map((i) => `▫️ ${i.un === 'un' ? (i.qtd > 1 ? fmtQtd(i.qtd) + 'x ' : '') : fmtQtd(i.qtd) + ' ' + i.un + ' '}${i.nome}${i.obs ? ` (${i.obs})` : ''}`), ''] : []; });
  const total = falta.reduce((s, i) => s + totalItem(i), 0);
  return `🛒 *${l.nome}*\n\n${linhas.join('\n')}${total ? `Total estimado: ${brl(total)}` : ''}`.trim();
}
$('#compartilhar').addEventListener('click', () => { if (!lista().itens.some((i) => !i.pego)) return toast('Não há itens faltando'); open('https://wa.me/?text=' + encodeURIComponent(textoLista()), '_blank', 'noopener'); });
$('#copiar').addEventListener('click', async () => { try { await navigator.clipboard.writeText(textoLista()); toast('Lista copiada!'); } catch { toast('Não foi possível copiar'); } });
$('#limpar-pegos').addEventListener('click', () => {
  const l = lista(), antes = [...l.itens], n = l.itens.filter((i) => i.pego).length; if (!n) return toast('Nenhum item marcado');
  l.itens = l.itens.filter((i) => !i.pego); render(); toast(`${n} ${n === 1 ? 'item tirado' : 'itens tirados'} da lista`, () => { l.itens = antes; render(); });
});
$$('[data-ver]').forEach((b) => b.addEventListener('click', () => { ver = b.dataset.ver; render(); }));

/* ---------- Utilitários ---------- */
const timers = new WeakMap();
function confirmar(b, texto) {
  if (b.classList.contains('confirmar')) { resetBtn(b, texto); return true; }
  b.classList.add('confirmar'); b.textContent = 'Toque de novo'; timers.set(b, setTimeout(() => resetBtn(b, texto), 3000)); return false;
}
function resetBtn(b, texto) { clearTimeout(timers.get(b)); b.classList.remove('confirmar'); b.textContent = texto; }
let toastT;
function toast(msg, desfazer) {
  const t = $('#toast'); t.innerHTML = `<span>${escapar(msg)}</span>${desfazer ? '<button>Desfazer</button>' : ''}`; t.hidden = false;
  if (desfazer) t.querySelector('button').addEventListener('click', () => { desfazer(); t.hidden = true; });
  const aberto = [dlgI, dlgL].find((d) => d.open); (aberto || document.body).append(t);
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4000);
}
const vibrar = (p) => { try { navigator.vibrate?.(p); } catch { /* sem vibração */ } };
render();
