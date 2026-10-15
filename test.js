/* Harness de validation — exécute le script de index.html dans Node avec un mock DOM.
   Nécessite Node uniquement pour les tests ; l'outil lui-même n'en a pas besoin. */
'use strict';
const fs = require('fs');
const path = require('path');

/* ----- Lecture du fichier applicatif ----- */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error('FAIL : balise <script> introuvable'); process.exit(1); }
/* Ids réellement présents dans le DOM : tout sélecteur inconnu est une erreur */
const KNOWN_IDS = new Set(Array.from(html.matchAll(/id="([^"]+)"/g), x => x[1]));

/* ----- Mocks navigateur minimaux ----- */
const els = new Map();
function makeEl(sel){
  return {
    _sel: sel, _handlers: {},
    value: '', innerHTML: '', textContent: '', hidden: false, files: [],
    addEventListener(ev, fn){ (this._handlers[ev] = this._handlers[ev] || []).push(fn); },
    dispatch(ev, arg){
      const e = arg || { target: this, defaultPrevented: false,
        preventDefault(){ this.defaultPrevented = true; } };
      (this._handlers[ev] || []).forEach(fn => fn(e));
      return e;
    },
    focus(){}, close(){}, showModal(){}, click(){}, remove(){}, appendChild(){},
    closest(){ return null; }
  };
}
const ls = {};
global.localStorage = {
  getItem: k => (k in ls ? ls[k] : null),
  setItem: (k, v) => { ls[k] = String(v); },
  removeItem: k => { delete ls[k]; }
};
global.document = {
  querySelector(sel){
    if(sel.charAt(0) === '#' && !KNOWN_IDS.has(sel.slice(1)))
      throw new Error('Sélecteur absent du DOM réel : ' + sel);
    if(!els.has(sel)) els.set(sel, makeEl(sel));
    return els.get(sel);
  },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl('created'); },
  body: { appendChild(){}, removeChild(){} },
  documentElement: {
    _attrs: {},
    setAttribute(k, v){ this._attrs[k] = v; },
    removeAttribute(k){ delete this._attrs[k]; },
    getAttribute(k){ return (k in this._attrs) ? this._attrs[k] : null; }
  }
};
global.confirm = () => true;
global.alert = m => console.log('[alert] ' + m);
let blobText = null;
global.Blob = class { constructor(parts){ blobText = parts.join(''); } };
global.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL(){} };
global.FileReader = class {
  readAsText(f){ this.result = f.__text; if(this.onload) this.onload(); }
};

/* ----- Exécution du script de l'application (m et html lus plus haut) ----- */

const tests = `
;(function(){
  let failed = 0;
  function assert(cond, msg){
    if(cond){ console.log('  OK  ' + msg); }
    else { console.log('FAIL  ' + msg); failed++; }
  }
  // 1. Chargement de l'exemple
  loadSample();
  assert(persons.length === 10, 'Exemple : 10 villageois chargés');

  // 2. Générations
  assert(generationOf('s1') === 0, 'Guillaume = génération 1');
  assert(generationOf('s3') === 1, 'Henri = génération 2');
  assert(generationOf('s6') === 2, 'Thomas = génération 3');
  assert(generationOf('s8') === 3, 'Lucas = génération 4');
  assert(getPerson('s1').death === '1502' && getPerson('s2').death === '1509',
    'Années de mort de l exemple (1502 / 1509)');
  assert(getPerson('s1').birth === '1434' && getPerson('s3').birth === '1455',
    'Dates de naissance de l exemple (1434 / 1455)');
  assert(getPerson('s6').marriage === '1499' && getPerson('s7').marriage === '1499',
    'Années de mariage de l exemple (1499) synchronisées');
  assert(!('profession' in getPerson('s1')), 'Champ métier retiré du modèle');

  // 3. Liens de conjoints réciproques
  assert(getPerson('s1').spouse === 's2' && getPerson('s2').spouse === 's1',
    'Mariage Guillaume/Alix réciproque');

  // 4. Statistiques
  assert(countCouples() === 3, '3 couples comptés');
  assert(countFamilies() === 2, '2 familles (domaine + Gautier)');

  // 5. Rendus
  const treeHtml = document.querySelector('#tree').innerHTML;
  assert(treeHtml.indexOf('Guillaume') >= 0 && treeHtml.indexOf('Lucas') >= 0
    && treeHtml.indexOf('Gautier') >= 0, 'Arbre : racines + descendants + isolé affichés');
  assert(treeHtml.indexOf('Guillaume') < treeHtml.indexOf('Lucas'),
    'Arbre : l ancêtre précède sa descendance');
  const listHtml = document.querySelector('#list-body').innerHTML;
  assert(listHtml.indexOf('Béatrice') >= 0, 'Liste : Béatrice présente');
  assert(listHtml.indexOf('Décédé') >= 0, 'Liste : statut Décédé affiché');
  assert(listHtml.indexOf('1502') >= 0, 'Liste : colonne Décès (1502) affichée');
  assert(listHtml.indexOf('né en 1455') >= 0, 'Liste : date de naissance sous le nom');
  assert(listHtml.indexOf('45 ans') >= 0, 'Liste : colonne Âge (Henri, 45 ans en 1500)');
  assert(treeHtml.indexOf('(1502)') >= 0, 'Arbre : année de mort affichée');
  assert(document.querySelector('#stats').innerHTML.indexOf('Générations') >= 0,
    'Stats : cartes affichées');
  assert(listHtml.indexOf('(m. 1499)') >= 0, 'Liste : année de mariage (m. 1499)');
  assert(listHtml.indexOf('Fermier') < 0, 'Liste : plus aucune colonne métier');
  assert(treeHtml.indexOf('⚭ 1476') >= 0, 'Arbre : année de mariage (⚭ 1476)');
  assert(document.querySelector('#stats-extra').innerHTML.indexOf('Mariages') >= 0,
    'Stats : panneau Mariages affiché');

  // 4bis. Calcul des âges et année actuelle du jeu
  assert(gameYear === 1500, 'Année du jeu par défaut : 1500');
  assert(ageOf(getPerson('s3')) === 45, 'Henri (né 1455) a 45 ans en 1500');
  assert(ageOf(getPerson('s1')) === 68, 'Guillaume est mort à 68 ans (1434 → 1502)');
  assert(ageOf(getPerson('s9')) === null, 'Emma (née 1502) : âge — avant sa naissance');
  document.querySelector('#game-year').value = '1510';
  document.querySelector('#game-year').dispatch('change');
  assert(gameYear === 1510, 'Année du jeu modifiée : 1510');
  assert(ageOf(getPerson('s3')) === 55, 'Henri a 55 ans en 1510');
  assert(ageOf(getPerson('s9')) === 8, 'Emma (née 1502) a 8 ans en 1510');
  assert(document.querySelector('#list-body').innerHTML.indexOf('55 ans') >= 0,
    'Liste recalculée avec la nouvelle année');
  assert(localStorage.getItem('md-genealogie-annee') === '1510', 'Année du jeu persistée');
  document.querySelector('#game-year').value = '1500';
  document.querySelector('#game-year').dispatch('change');
  assert(ageOf(getPerson('s3')) === 45, 'Retour à l année 1500 → 45 ans');

  // 4ter. Thèmes de couleurs
  assert(document.documentElement.getAttribute('data-theme') === null,
    'Thème par défaut : Parchemin (aucun data-theme)');
  document.querySelector('#theme-select').value = 'sombre';
  document.querySelector('#theme-select').dispatch('change');
  assert(document.documentElement.getAttribute('data-theme') === 'sombre',
    'Thème sombre appliqué');
  assert(localStorage.getItem('md-genealogie-theme') === 'sombre', 'Thème persisté');
  document.querySelector('#theme-select').value = 'parchemin';
  document.querySelector('#theme-select').dispatch('change');
  assert(document.documentElement.getAttribute('data-theme') === null,
    'Retour au thème Parchemin');

  // 5bis. Ordre d'ancrage : le conjoint qui épouse la famille ne doit pas ouvrir l'arbre
  const i4 = persons.findIndex(x => x.id === 's4'); // Béatrice, sans parent
  persons.unshift(persons.splice(i4, 1)[0]);
  renderTree();
  const th = document.querySelector('#tree').innerHTML;
  assert(th.indexOf('Guillaume') < th.indexOf('Béatrice'),
    'Béatrice rattachée à la branche de son conjoint, même en tête de liste');
  assert(th.indexOf('Henri') < th.indexOf('Lucas'), 'Descendance ordonnée sous les ancêtres');
  const i4b = persons.findIndex(x => x.id === 's4');
  persons.push(persons.splice(i4b, 1)[0]); // restaure l'ordre d'origine
  renderTree();

  // 6. Ajout d un villageois via le formulaire
  editingId = null;
  document.querySelector('#f-name').value = 'Étienne';
  document.querySelector('#f-gender').value = 'M';
  document.querySelector('#f-status').value = 'alive';
  document.querySelector('#f-birth').value = '1480';
  document.querySelector('#f-marriage').value = '1502';
  document.querySelector('#f-death').value = '';
  document.querySelector('#f-notes').value = '';
  document.querySelector('#f-father').value = 's8';   // Lucas
  document.querySelector('#f-mother').value = '';
  document.querySelector('#f-spouse').value = '';
  document.querySelector('#form').dispatch('submit');
  assert(persons.length === 11, 'Ajout : 11 villageois');
  const added = persons.find(x => x.name === 'Étienne');
  assert(!!added && added.father === 's8', 'Étienne est fils de Lucas');
  assert(added.birth === '1480', 'Date de naissance enregistrée (1480)');
  assert(ageOf(added) === 20, 'Étienne a 20 ans en 1500');
  assert(added.marriage === '', 'Année de mariage effacée sans conjoint');
  assert(!('profession' in added), 'Aucun champ métier à la création');
  assert(generationOf(added.id) === 4, 'Étienne = génération 5');

  // 7. Ouverture du dialogue + protection anti-cycle
  openEdit(added.id);
  assert(document.querySelector('#dlg-title').textContent === 'Modifier : Étienne',
    'Dialogue de modification ouvert');
  document.querySelector('#f-father').value = added.id; // soi-même comme parent
  document.querySelector('#f-death').value = '1530';
  document.querySelector('#f-spouse').value = 's10';
  document.querySelector('#f-marriage').value = '1505';
  document.querySelector('#form').dispatch('submit');
  assert(getPerson(added.id).father === null, 'Cycle parent/enfant bloqué');
  assert(getPerson(added.id).status === 'dead' && getPerson(added.id).death === '1530',
    'Année de mort 1530 → statut Décédé forcé');
  assert(ageOf(getPerson(added.id)) === 50, 'Âge au décès calculé (1480 → 1530 = 50 ans)');
  assert(getPerson(added.id).spouse === 's10', 'Étienne lié à Gautier (conjoints)');
  assert(getPerson('s10').marriage === '1505',
    'Année de mariage synchronisée sur les deux conjoints');
  assert(document.querySelector('#list-body').innerHTML.indexOf('(m. 1505)') >= 0,
    'Liste : (m. 1505) affiché');

  // 7bis. Refus d une naissance postérieure à la mort
  openEdit(added.id);
  document.querySelector('#f-birth').value = '1600';
  const evBad = document.querySelector('#form').dispatch('submit');
  assert(evBad.defaultPrevented === true, 'Saisie bloquée : naissance (1600) > mort (1530)');
  assert(getPerson(added.id).birth === '1480', 'Données inchangées après le refus');

  // 8. Export JSON
  exportJson();
  const parsed = JSON.parse(blobText);
  assert(parsed.app === 'medieval-dynasty-genealogie' && parsed.persons.length === 11,
    'Export JSON valide (11 villageois)');
  assert(parsed.persons.some(x => x.birth === '1480'), 'Export : date de naissance incluse');
  assert(parsed.persons.some(x => x.marriage === '1505'), 'Export : année de mariage incluse');
  assert(!parsed.persons.some(x => 'profession' in x), 'Export : champ métier absent');

  // 9. Import JSON (mariage asymétrique réparé)
  importFile({ __text: JSON.stringify({ persons: [
    { id:'a', name:'Ana', gender:'F', status:'alive', spouse:'b', death:'a1599', born:'a1450', marriage:'a1490' },
    { id:'b', name:'Bob', gender:'M', status:'alive' }
  ]}) });
  assert(persons.length === 2, 'Import : 2 villageois');
  assert(getPerson('a').spouse === 'b' && getPerson('b').spouse === 'a',
    'Import : mariage rendu réciproque');
  assert(getPerson('a').birth === '1450', 'Import : ancien champ "born" migré en "birth"');
  assert(getPerson('a').marriage === '1490' && getPerson('b').marriage === '1490',
    'Import : année de mariage nettoyée et synchronisée');
  assert(getPerson('a').death === '1599' && getPerson('a').status === 'dead',
    'Import : année de mort nettoyée (chiffres seuls) + statut Décédé');

  // 10. Suppression avec nettoyage des liens
  deletePerson('a');
  assert(persons.length === 1 && getPerson('b').spouse === null
    && getPerson('b').marriage === '', 'Suppression : liens et mariage nettoyés');

  // 11. Persistance locale
  assert(JSON.parse(localStorage.getItem('md-genealogie-v1')).length === 1,
    'localStorage mis à jour');
  assert(localStorage.getItem('md-genealogie-annee') === '1500',
    'Année du jeu (1500) persistée');

  // 12. Tri : sortModes appliqués directement + sélecteur branché
  loadSample(); // 10 villageois, ordre d'origine
  const sortedNames = mode => sortPersons(persons, mode).map(x => x.name);
  assert(sortedNames('name')[0] === 'Alix', 'Tri Nom A→Z : Alix en premier');
  assert(sortedNames('nameZ')[0] === 'Thomas', 'Tri Nom Z→A : Thomas en premier');
  const gAsc = sortPersons(persons, 'gen').map(x => generationOf(x.id));
  assert(gAsc[0] === 0 && gAsc[gAsc.length - 1] === 3, 'Tri Génération 1→N');
  const gDesc = sortPersons(persons, 'genZ').map(x => generationOf(x.id));
  assert(gDesc[0] === 3 && gDesc[gDesc.length - 1] === 0, 'Tri Génération N→1');
  assert(sortedNames('birth')[0] === 'Guillaume', 'Tri Naissance : le plus ancien (1434) en premier');
  assert(sortedNames('marriage')[0] === 'Guillaume', 'Tri Mariage : le plus ancien (1454) en premier');
  assert(sortPersons(persons, 'dead')[0].status === 'dead', 'Tri Décédés en premier');
  assert(sortPersons(persons, 'alive')[0].status === 'alive', 'Tri Vivants en premier');
  assert(sortPersons(persons, 'inconnu')[0].name === 'Alix', 'Mode inconnu → tri par défaut (génération + A→Z)');
  const rowNames = () => document.querySelector('#list-body').innerHTML
    .split('<b>').slice(1).map(s => s.split('</b>')[0]);
  document.querySelector('#sort-mode').value = 'nameZ';
  document.querySelector('#sort-mode').dispatch('change');
  assert(rowNames()[0] === 'Thomas', 'Sélecteur de tri branché : Z→A appliqué à la liste');
  document.querySelector('#sort-mode').value = 'default';
  document.querySelector('#sort-mode').dispatch('change');
  assert(rowNames()[0] === 'Alix' && sortMode === 'default',
    'Retour au tri par défaut via le sélecteur');
  assert(document.querySelector('#family-people').innerHTML.indexOf('Guillaume') >= 0,
    'Datalist des proches peuplée avec les noms');

  // 13. Liens familiaux par nom saisi librement (datalist)
  editingId = null;
  document.querySelector('#f-name').value = 'Pierre';
  document.querySelector('#f-gender').value = 'M';
  document.querySelector('#f-status').value = 'alive';
  document.querySelector('#f-birth').value = '1470';
  document.querySelector('#f-death').value = '';
  document.querySelector('#f-marriage').value = '';
  document.querySelector('#f-notes').value = '';
  document.querySelector('#f-father').value = 'lucas';    // nom en minuscules
  document.querySelector('#f-mother').value = 'BÉATRICE'; // casse différente
  document.querySelector('#f-spouse').value = 'Emma';
  document.querySelector('#form').dispatch('submit');
  const pierre = persons.find(x => x.name === 'Pierre');
  assert(!!pierre && pierre.father === 's8', 'Père résolu par nom (« lucas » → s8, Lucas)');
  assert(pierre.mother === 's4', 'Mère résolue par nom (« BÉATRICE » → s4)');
  assert(pierre.spouse === 's9' && getPerson('s9').spouse === pierre.id,
    'Conjointe résolue par nom (« Emma ») avec lien réciproque');

  // 13bis. Saisie invalide : nom inconnu ou mauvais genre → refus
  openEdit(pierre.id);
  assert(document.querySelector('#f-father').value === 'Lucas',
    'Modification : champ père pré-rempli par le nom (pas par identifiant)');
  editingId = null;
  document.querySelector('#f-name').value = 'Jean';
  document.querySelector('#f-father').value = 'Inconnu Total';
  document.querySelector('#f-mother').value = '';
  document.querySelector('#f-spouse').value = '';
  const evUnknown = document.querySelector('#form').dispatch('submit');
  assert(evUnknown.defaultPrevented === true, 'Parent introuvable → saisie bloquée');
  assert(!persons.some(x => x.name === 'Jean'), 'Aucun villageois ajouté sur nom inconnu');
  document.querySelector('#f-father').value = 'Alix'; // femme désignée comme père
  const evGender = document.querySelector('#form').dispatch('submit');
  assert(evGender.defaultPrevented === true, 'Femme désignée comme père → saisie bloquée');
  assert(!persons.some(x => x.name === 'Jean'), 'Aucun villageois ajouté sur mauvais genre');

  console.log(failed ? '\\n' + failed + ' échec(s)' : '\\nTous les tests sont passés.');
  if(failed) process.exitCode = 1;
})();
`;

eval(m[1] + tests);
