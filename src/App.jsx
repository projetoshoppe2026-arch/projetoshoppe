import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const STATUS = {
  pendente: { label: 'Pendente', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  pronto: { label: 'Pronto', color: 'var(--green)', bg: 'var(--green-bg)' },
  publicado: { label: 'Publicado', color: 'var(--blue)', bg: 'var(--blue-bg)' },
  pausado: { label: 'Pausado', color: 'var(--gray)', bg: 'var(--gray-bg)' },
}

const CATS = [
  'Luvas Descartáveis', 'Carregadores e Acessórios', 'Beleza e Cuidado',
  'Travesseiros', 'Perfumes', 'Projetores', 'Brinquedos RC',
  'Eletrônicos', 'Bebê e Infantil', 'Ferramentas', 'Outro',
]

const blank = {
  sku: '', nome: '', marca: '', categoria: '', custo: '',
  preco_ml: '', preco_shopee: '', estoque: '', peso_kg: '',
  dimensoes: '', ean_gtin: '', fornecedor: '', prazo_reposicao: 7,
  status: 'pendente', lote: 1, notas: '', foto_url: '',
}

const calcPreco = (c, m = 0.20) => {
  if (!c || c <= 0) return 0
  const d = 1 - 0.20 - 0.05 - 0.06 - m
  return d > 0 ? (c / d).toFixed(2) : 0
}

const calcMargem = (c, p) => {
  if (!c || !p || p <= 0) return 0
  const t = p * 0.20 + 4 + p * 0.05 + p * 0.06
  return (((p - c - t) / p) * 100).toFixed(1)
}

function Toast({ msg }) {
  if (!msg) return null
  return <div className={`toast ${msg.ok ? 'toast-ok' : 'toast-err'}`}>{msg.text}</div>
}

function Stats({ data }) {
  const items = [
    { l: 'Total', v: data.length, c: 'var(--text)' },
    { l: 'Publicados', v: data.filter(p => p.status === 'publicado').length, c: 'var(--blue)' },
    { l: 'Prontos', v: data.filter(p => p.status === 'pronto').length, c: 'var(--green)' },
    { l: 'Pendentes', v: data.filter(p => p.status === 'pendente').length, c: 'var(--amber)' },
  ]
  return (
    <div className="grid-4">
      {items.map(s => (
        <div key={s.l} className="stat-card">
          <p className="stat-value" style={{ color: s.c }}>{s.v}</p>
          <p className="stat-label">{s.l}</p>
        </div>
      ))}
    </div>
  )
}

function Form({ product, onSave, onCancel, saving }) {
  const [f, setF] = useState(product || blank)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  useEffect(() => { setF(product || blank) }, [product])

  const sug = calcPreco(parseFloat(f.custo) || 0)
  const mg = calcMargem(parseFloat(f.custo) || 0, parseFloat(f.preco_shopee) || parseFloat(sug) || 0)
  const mgClass = parseFloat(mg) >= 15 ? 'margin-ok' : parseFloat(mg) >= 5 ? 'margin-warn' : 'margin-bad'
  const mgColor = parseFloat(mg) >= 15 ? '#0F6E56' : parseFloat(mg) >= 5 ? '#854F0B' : '#A32D2D'

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 18 }}>
        {product?.id ? 'Editar produto' : 'Cadastrar produto'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="grid-2">
          <div><label className="label">SKU *</label><input value={f.sku} onChange={e => set('sku', e.target.value)} placeholder="Ex: LattafaAsad" /></div>
          <div><label className="label">Nome do produto *</label><input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" /></div>
        </div>
        <div className="grid-2">
          <div><label className="label">Marca</label><input value={f.marca} onChange={e => set('marca', e.target.value)} placeholder="Ex: Lattafa" /></div>
          <div><label className="label">Categoria</label>
            <select value={f.categoria} onChange={e => set('categoria', e.target.value)}>
              <option value="">Selecione</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid-3">
          <div><label className="label">Custo (R$) *</label><input type="number" step="0.01" value={f.custo} onChange={e => set('custo', e.target.value)} placeholder="0.00" /></div>
          <div><label className="label">Preço ML (R$)</label><input type="number" step="0.01" value={f.preco_ml} onChange={e => set('preco_ml', e.target.value)} placeholder="0.00" /></div>
          <div><label className="label">Preço Shopee (R$)</label><input type="number" step="0.01" value={f.preco_shopee} onChange={e => set('preco_shopee', e.target.value)} placeholder={sug > 0 ? `Sugerido: ${sug}` : '0.00'} /></div>
        </div>
        {parseFloat(f.custo) > 0 && (
          <div className={`margin-hint ${mgClass}`}>
            <span>Preço sugerido (margem 20%): <strong>R$ {sug}</strong></span>
            <span>Margem atual: <strong style={{ color: mgColor }}>{mg}%</strong></span>
          </div>
        )}
        <div className="grid-3">
          <div><label className="label">Estoque</label><input type="number" value={f.estoque} onChange={e => set('estoque', e.target.value)} placeholder="0" /></div>
          <div><label className="label">Peso (kg)</label><input type="number" step="0.001" value={f.peso_kg} onChange={e => set('peso_kg', e.target.value)} placeholder="0.000" /></div>
          <div><label className="label">EAN/GTIN</label><input value={f.ean_gtin} onChange={e => set('ean_gtin', e.target.value)} placeholder="Cód. barras" /></div>
        </div>
        <div className="grid-2">
          <div><label className="label">Fornecedor</label><input value={f.fornecedor} onChange={e => set('fornecedor', e.target.value)} /></div>
          <div><label className="label">Dimensões (CxLxA cm)</label><input value={f.dimensoes} onChange={e => set('dimensoes', e.target.value)} placeholder="30x20x10" /></div>
        </div>
        <div className="grid-2">
          <div><label className="label">Status</label>
            <select value={f.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="label">Lote</label>
            <select value={f.lote} onChange={e => set('lote', parseInt(e.target.value))}>
              <option value={1}>Lote 1 — Prioridade alta</option>
              <option value={2}>Lote 2 — Prioridade média</option>
              <option value={3}>Lote 3 — Avaliar</option>
            </select>
          </div>
        </div>
        <div><label className="label">URL da foto</label><input value={f.foto_url} onChange={e => set('foto_url', e.target.value)} placeholder="https://..." /></div>
        {f.foto_url && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img src={f.foto_url} alt="Preview" onError={e => e.target.style.display = 'none'}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Preview da foto</span>
          </div>
        )}
        <div><label className="label">Notas</label><textarea value={f.notas} onChange={e => set('notas', e.target.value)} placeholder="Observações..." rows={2} /></div>
        <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => onSave(f)} disabled={!f.sku || !f.nome || saving}>
            {saving ? 'Salvando...' : product?.id ? 'Atualizar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({ product, onEdit, onDelete }) {
  const st = STATUS[product.status] || STATUS.pendente
  const mg = calcMargem(parseFloat(product.custo) || 0, parseFloat(product.preco_shopee) || 0)
  const mgColor = parseFloat(mg) >= 15 ? '#0F6E56' : parseFloat(mg) >= 5 ? '#854F0B' : '#A32D2D'

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {product.foto_url && (
        <img src={product.foto_url} alt={product.nome}
          onError={e => e.target.style.display = 'none'}
          style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, background: 'var(--bg3)' }} />
      )}
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex gap-2 items-center" style={{ marginBottom: 4 }}>
            <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Lote {product.lote}</span>
          </div>
          <p className="product-name">{product.nome}</p>
          <p className="product-sku">{product.sku}</p>
        </div>
        <div className="flex gap-2" style={{ flexShrink: 0 }}>
          <button className="btn-icon" onClick={() => onEdit(product)} title="Editar">✏️</button>
          <button className="btn-icon" onClick={() => onDelete(product.id)} title="Excluir" style={{ color: 'var(--red)' }}>🗑️</button>
        </div>
      </div>
      <div className="grid-3" style={{ gap: 8 }}>
        <div className="mini-stat">
          <p className="mini-stat-label">Custo</p>
          <p className="mini-stat-value">R$ {parseFloat(product.custo || 0).toFixed(2)}</p>
        </div>
        <div className="mini-stat">
          <p className="mini-stat-label">Shopee</p>
          <p className="mini-stat-value">R$ {parseFloat(product.preco_shopee || 0).toFixed(2)}</p>
        </div>
        <div className="mini-stat">
          <p className="mini-stat-label">Margem</p>
          <p className="mini-stat-value" style={{ color: mgColor }}>{mg}%</p>
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
        {[product.categoria, product.marca, product.estoque ? `${product.estoque} un` : null].filter(Boolean).join(' · ')}
      </span>
    </div>
  )
}

export default function App() {
  const [produtos, setProdutos] = useState([])
  const [view, setView] = useState('list')
  const [edit, setEdit] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000) }

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('produtos').select('*').order('created_at', { ascending: false })
    if (error) flash('Erro ao carregar: ' + error.message, false)
    else setProdutos(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async (f) => {
    setSaving(true)
    const row = {
      sku: f.sku, nome: f.nome, marca: f.marca || null, categoria: f.categoria || null,
      custo: parseFloat(f.custo) || 0, preco_ml: parseFloat(f.preco_ml) || 0,
      preco_shopee: parseFloat(f.preco_shopee) || 0, estoque: parseInt(f.estoque) || 0,
      peso_kg: parseFloat(f.peso_kg) || 0, dimensoes: f.dimensoes || null,
      ean_gtin: f.ean_gtin || null, fornecedor: f.fornecedor || null,
      prazo_reposicao: parseInt(f.prazo_reposicao) || 7,
      status: f.status, lote: parseInt(f.lote) || 1, notas: f.notas || null,
      foto_url: f.foto_url || null,
      margem_shopee: parseFloat(calcMargem(parseFloat(f.custo) || 0, parseFloat(f.preco_shopee) || 0)) || 0,
    }

    let error
    if (edit?.id) {
      ({ error } = await supabase.from('produtos').update(row).eq('id', edit.id))
      if (!error) flash('Produto atualizado!')
    } else {
      ({ error } = await supabase.from('produtos').insert(row))
      if (!error) flash('Produto cadastrado!')
    }
    if (error) flash('Erro: ' + error.message, false)
    else { setView('list'); setEdit(null); await load() }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('Excluir este produto?')) return
    const { error } = await supabase.from('produtos').delete().eq('id', id)
    if (error) flash('Erro: ' + error.message, false)
    else { flash('Produto excluído!'); await load() }
  }

  const exportCSV = () => {
    if (!produtos.length) return
    const cols = ['sku','nome','marca','categoria','custo','preco_ml','preco_shopee','estoque','peso_kg','dimensoes','ean_gtin','fornecedor','status','lote','notas']
    const csv = [cols.join(','), ...produtos.map(p => cols.map(c => `"${String(p[c] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'produtos_shopee.csv'; a.click()
  }

  const filtered = produtos.filter(p => {
    const mf = filter === 'todos' || p.status === filter || (filter === 'lote1' && p.lote === 1) || (filter === 'lote2' && p.lote === 2) || (filter === 'lote3' && p.lote === 3)
    const ms = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    return mf && ms
  })

  return (
    <div style={{ padding: '20px', maxWidth: 860, margin: '0 auto' }}>
      <Toast msg={msg} />

      <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>📦 Shopee Manager</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Cadastro e precificação de produtos</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ CSV</button>
          <button className="btn btn-primary" onClick={() => { setView('form'); setEdit(null) }}>+ Novo produto</button>
        </div>
      </div>

      {view === 'form' ? (
        <Form product={edit} onSave={save} onCancel={() => { setView('list'); setEdit(null) }} saving={saving} />
      ) : (
        <>
          <Stats data={produtos} />

          <div className="flex gap-2 items-center" style={{ margin: '14px 0', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." />
            </div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {[['todos','Todos'],['pendente','Pendentes'],['pronto','Prontos'],['publicado','Publicados'],['lote1','Lote 1'],['lote2','Lote 2']].map(([k,l]) => (
                <button key={k} className={`filter-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="empty"><p>Carregando...</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <p style={{ fontSize: 36, marginBottom: 8 }}>📦</p>
              <p>{produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum resultado'}</p>
              {produtos.length === 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setView('form')}>Cadastrar primeiro produto</button>}
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map(p => <Card key={p.id} product={p} onEdit={pr => { setEdit(pr); setView('form') }} onDelete={del} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
