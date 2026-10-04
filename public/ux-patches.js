(() => {
  const $ = id => document.getElementById(id);
  const all = s => Array.from(document.querySelectorAll(s));
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function hideOwnerPersonalInputs() {
    ['propertyOwnerPhone','propertyOwnerEmail','propertyOwnerAddress'].forEach(id => {
      const input = $(id);
      if (!input) return;
      const label = input.closest('label');
      if (label) label.remove(); else input.remove();
    });
  }

  function modalize(panelId) {
    const panel = $(panelId);
    if (!panel || panel.dataset.modalized === '1') return;
    panel.dataset.modalized = '1';
    panel.classList.add('ux-modal-panel');
  }

  function addPropertySummaryToBrokerCards() {
    const box = $('brokerList');
    if (!box || typeof sb !== 'function') return;
    all('.broker-card').forEach(async card => {
      const button = card.querySelector('[data-broker]');
      if (!button || card.querySelector('.broker-properties')) return;
      const id = button.dataset.broker;
      try {
        const rows = await sb('feedback_properties', { query: `select=id,proprietario_nome,endereco,ativo&broker_id=eq.${encodeURIComponent(id)}&ativo=eq.true&order=proprietario_nome.asc` });
        const section = document.createElement('div');
        section.className = 'broker-properties';
        section.innerHTML = `<div class="broker-properties-title">Imóveis vinculados <span>${rows.length}</span></div>` +
          (rows.length ? rows.map(p => `<div class="broker-property-row"><span><b>${esc(p.proprietario_nome || 'Sem proprietário')}</b><small>${esc(p.endereco || 'Endereço não informado')}</small></span><button type="button" class="secondary-button small" data-open-broker-property="${esc(p.id)}">Abrir</button></div>`).join('') : '<div class="broker-property-empty">Nenhum imóvel vinculado.</div>');
        card.appendChild(section);
        all('[data-open-broker-property]').forEach(btn => {
          if (btn.dataset.bound) return;
          btn.dataset.bound = '1';
          btn.onclick = async () => {
            localStorage.setItem('feedbackActiveBroker', id);
            await loadProperties();
            if ($('ownerSelect')) $('ownerSelect').value = btn.dataset.openBrokerProperty;
            if (typeof updateOwnerFields === 'function') updateOwnerFields();
            if (typeof showPage === 'function') showPage('feedback');
          };
        });
      } catch (_) {}
    });
  }

  function renameVisibleProduct() {
    document.title = 'Feedback Maker — RE/MAX';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { if (node.nodeValue.includes('Feedback Manager')) node.nodeValue = node.nodeValue.replaceAll('Feedback Manager', 'Feedback Maker'); });
  }

  const observer = new MutationObserver(() => {
    hideOwnerPersonalInputs();
    modalize('propertyFormPanel');
    modalize('brokerFormPanel');
    addPropertySummaryToBrokerCards();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('load', () => {
    hideOwnerPersonalInputs();
    modalize('propertyFormPanel');
    modalize('brokerFormPanel');
    addPropertySummaryToBrokerCards();
    renameVisibleProduct();
  });
})();
