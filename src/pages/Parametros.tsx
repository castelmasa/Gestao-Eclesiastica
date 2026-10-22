import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { cnpj as cnpjValidator } from "cpf-cnpj-validator"
import { useNavigate } from "react-router-dom"
import { Building2, Palette, Sparkles } from "lucide-react"
import { DigitalSignatureField } from "@/components/common/DigitalSignatureField"

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const defaultConfig = {
  nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
  cnpj: "51.105.484/0001-74",
  endereco: "Rua Bartolomeu Bueno, Nº 629",
  bairro: "Santa Casa",
  cidade: "Valparaiso - SP",
  cep: "16880-000",
  pontoReferencia: "",
  pastorTitular: "Pr. Samuel de Oliveira",
  pastorTelefone: "",
  pastorEmail: "",
  pastorSignatureUrl: "",
  pastorSignatureFileName: "",
  vicePresidente: "",
  vicePresidenteTelefone: "",
  vicePresidenteEmail: "",
  vicePresidenteSignatureUrl: "",
  vicePresidenteSignatureFileName: "",
  secretario1: "",
  secretario1Telefone: "",
  secretario1Email: "",
  secretario1SignatureUrl: "",
  secretario1SignatureFileName: "",
  secretario2: "",
  secretario2Telefone: "",
  secretario2Email: "",
  secretario2SignatureUrl: "",
  secretario2SignatureFileName: "",
  tesoureiro1: "Carlos Roberto",
  tesoureiro1Telefone: "",
  tesoureiro1Email: "",
  tesoureiro1SignatureUrl: "",
  tesoureiro1SignatureFileName: "",
  tesoureiro2: "",
  tesoureiro2Telefone: "",
  tesoureiro2Email: "",
  tesoureiro2SignatureUrl: "",
  tesoureiro2SignatureFileName: "",
  conselhoFiscal1: "",
  conselhoFiscal1Telefone: "",
  conselhoFiscal1Email: "",
  conselhoFiscal1SignatureUrl: "",
  conselhoFiscal1SignatureFileName: "",
  conselhoFiscal2: "",
  conselhoFiscal2Telefone: "",
  conselhoFiscal2Email: "",
  conselhoFiscal2SignatureUrl: "",
  conselhoFiscal2SignatureFileName: "",
  conselhoFiscal3: "",
  conselhoFiscal3Telefone: "",
  conselhoFiscal3Email: "",
  conselhoFiscal3SignatureUrl: "",
  conselhoFiscal3SignatureFileName: "",
  diretorPatrimonio: "",
  diretorPatrimonioTelefone: "",
  diretorPatrimonioEmail: "",
  diretorPatrimonioSignatureUrl: "",
  diretorPatrimonioSignatureFileName: "",
  logoFileName: "",
  logoDataUrl: "",
  secretarySignatureUrl: "",
  secretarySignatureFileName: "",
  tesoureiroSignatureUrl: "",
  tesoureiroSignatureFileName: "",
  mensagemAvisos: "Bem-vindo ao sistema de Gestão Eclesiástica. Aproveite as novas funcionalidades!"
}

export function Parametros() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeBranch, setActiveBranch, branches, activeBranchName, updateBranch } = useBranch()
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    return activeBranch && activeBranch !== 'all' ? activeBranch : 'sede'
  })

  const [churchData, setChurchData] = useState(defaultConfig)

  const getBranchConfigKey = (bId: string) => {
    return bId === 'sede' || !bId || bId === 'all' ? 'churchConfig' : `churchConfig_${bId}`
  }

  const loadBranchConfig = (bId: string) => {
    const key = getBranchConfigKey(bId)
    const specificSaved = localStorage.getItem(key)
    const globalSaved = localStorage.getItem('churchConfig')
    const branchObj = branches.find(b => b.id === bId)

    let base = { ...defaultConfig }
    if (globalSaved) {
      try { base = { ...base, ...JSON.parse(globalSaved) } } catch (e) {}
    }

    if (specificSaved) {
      try {
        setChurchData({ ...base, ...JSON.parse(specificSaved) })
        return
      } catch (e) {}
    }

    // Se é uma filial e não tinha config separada ainda
    if (branchObj && branchObj.type !== 'sede') {
      setChurchData({
        ...base,
        nome: branchObj.name || `${base.nome} - ${branchObj.name}`,
        cnpj: branchObj.cnpj || base.cnpj,
        endereco: branchObj.address || base.endereco,
        bairro: branchObj.bairro || base.bairro,
        cidade: branchObj.cidade || base.cidade,
        pastorTitular: branchObj.pastor || base.pastorTitular
      })
    } else {
      setChurchData(base)
    }
  }

  useEffect(() => {
    const currentId = activeBranch && activeBranch !== 'all' ? activeBranch : 'sede'
    setSelectedBranchId(currentId)
    loadBranchConfig(currentId)
  }, [activeBranch, branches])

  const handleBranchChange = (newId: string) => {
    setSelectedBranchId(newId)
    setActiveBranch(newId)
    loadBranchConfig(newId)
    const bName = branches.find(b => b.id === newId)?.name || (newId === 'sede' ? 'Sede' : 'Congregação')
    toast.success(`Congregação ativa alterada para: ${bName}`)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let { id, value } = e.target;
    
    // Simple phone mask
    if (id.toLowerCase().includes('telefone')) {
      let v = value.replace(/\D/g, "");
      if (v.length > 11) v = v.substring(0, 11);
      
      if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
      } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
      } else if (v.length > 0) {
        v = v.replace(/^(\d{0,2})/, "($1");
      }
      value = v;
    }

    setChurchData(prev => ({ ...prev, [id]: value }));
  }

  const handleSelectChange = (field: string, value: string) => {
    setChurchData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (churchData.cnpj && !cnpjValidator.isValid(churchData.cnpj.replace(/\D/g, ""))) {
        toast.error("CNPJ inválido. Verifique o número digitado.");
        return;
    }
    const key = getBranchConfigKey(selectedBranchId)
    localStorage.setItem(key, JSON.stringify(churchData))

    if (selectedBranchId === 'sede' || selectedBranchId === 'all') {
      localStorage.setItem("churchConfig", JSON.stringify(churchData))
    }

    if (selectedBranchId && selectedBranchId !== 'all') {
      try {
        await updateBranch(selectedBranchId, {
          name: churchData.nome,
          address: churchData.endereco,
          cnpj: churchData.cnpj,
          pastor: churchData.pastorTitular,
          phone: churchData.pastorTelefone || churchData.tesoureiro1Telefone,
          bairro: churchData.bairro,
          cidade: churchData.cidade
        })
      } catch (err) {
        console.error("Erro ao atualizar filial no Firestore:", err)
      }
    }

    window.dispatchEvent(new Event("churchConfigUpdated"))
    window.dispatchEvent(new Event("storage"))
    toast.success(`Parâmetros salvos com sucesso para ${activeBranchName}!`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Parâmetros</h2>
        <p className="text-muted-foreground mt-1">Configure os dados essenciais da Igreja, congregação ativa e liderança.</p>
      </div>

      {/* SELEÇÃO DA SEDE OU CONGREGAÇÃO ATIVA */}
      <Card className="border-primary/40 bg-primary/5 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Sede ou Congregação Ativa</CardTitle>
          </div>
          <CardDescription>
            Selecione a Sede ou a Congregação desejada. A escolha ficará guardada e direcionará as informações e relatórios em todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Escolher Sede ou Congregação</Label>
              <Select value={selectedBranchId} onValueChange={handleBranchChange}>
                <SelectTrigger className="bg-background h-10 font-semibold border-primary/40 text-foreground">
                  <SelectValue placeholder="Selecione a sede ou congregação..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sede" className="font-semibold">
                    🏛️ Sede (Matriz Principal)
                  </SelectItem>
                  {branches.filter(b => b.type !== 'sede').map(b => (
                    <SelectItem key={b.id} value={b.id} className="font-medium">
                      ⛪ {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 rounded-lg bg-background border border-border/80 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Operando como: {activeBranchName}
              </div>
              As informações abaixo refletem os dados desta congregação. Qualquer alteração feita e salva aqui será aplicada aos documentos e relatórios correspondentes.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8 shadow-sm border border-border/70 rounded-2xl bg-card">
          <CardHeader>
            <CardTitle>Dados da Igreja</CardTitle>
            <CardDescription>Informações básicas que aparecerão em relatórios e documentos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Igreja</Label>
              <Input id="nome" value={churchData.nome} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={churchData.cnpj} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={churchData.endereco} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={churchData.bairro} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={churchData.cidade} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={churchData.cep || ""} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pontoReferencia">Ponto de Referência</Label>
                <Input id="pontoReferencia" value={churchData.pontoReferencia} onChange={handleChange} />
              </div>
            </div>


            <div className="pt-6 mt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Liderança Pastoral</h3>
              
              <div className="space-y-4">
                {/* Pastor Titular */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="pastorTitular" className="font-semibold text-sm text-foreground">Pastor Titular / Presidente</Label>
                    <Input id="pastorTitular" value={churchData.pastorTitular || ""} onChange={handleChange} placeholder="Nome completo do Pastor Presidente" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <Label htmlFor="pastorTelefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="pastorTelefone" value={churchData.pastorTelefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-8 space-y-1.5">
                      <Label htmlFor="pastorEmail" className="text-xs font-medium text-muted-foreground">E-mail do Pastor</Label>
                      <Input id="pastorEmail" type="email" value={churchData.pastorEmail || ""} onChange={handleChange} placeholder="pastor@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (Pastor Titular / Presidente)"
                    helperText="Assinatura/rubrica para relatórios financeiros, certidões e balanços oficiais."
                    value={churchData.pastorSignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      pastorSignatureUrl: url,
                      pastorSignatureFileName: fileName || ""
                    }))}
                  />
                </div>

                {/* Vice-Presidente */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="vicePresidente" className="font-semibold text-sm text-foreground">Vice-Presidente / Co-Pastor</Label>
                    <Input id="vicePresidente" value={churchData.vicePresidente || ""} onChange={handleChange} placeholder="Nome completo do Vice-Presidente" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-4 space-y-1.5">
                      <Label htmlFor="vicePresidenteTelefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="vicePresidenteTelefone" value={churchData.vicePresidenteTelefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-8 space-y-1.5">
                      <Label htmlFor="vicePresidenteEmail" className="text-xs font-medium text-muted-foreground">E-mail do Vice-Pres.</Label>
                      <Input id="vicePresidenteEmail" type="email" value={churchData.vicePresidenteEmail || ""} onChange={handleChange} placeholder="vice@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (Vice-Presidente / Co-Pastor)"
                    helperText="Assinatura/rubrica do co-pastor ou vice-presidente da congregação."
                    value={churchData.vicePresidenteSignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      vicePresidenteSignatureUrl: url,
                      vicePresidenteSignatureFileName: fileName || ""
                    }))}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Secretaria</h3>
              
              <div className="space-y-4 mb-6">
                {/* 1º Secretário */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="secretario1" className="font-semibold text-sm text-foreground">1º Secretário(a)</Label>
                    <Input id="secretario1" value={churchData.secretario1 || ""} onChange={handleChange} placeholder="Nome completo do 1º Secretário(a)" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="secretario1Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="secretario1Telefone" value={churchData.secretario1Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="secretario1Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="secretario1Email" type="email" value={churchData.secretario1Email || ""} onChange={handleChange} placeholder="secretaria1@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (1º Secretário)"
                    helperText="Assinatura oficial para certidões, cartas pastorais e atas da secretaria."
                    value={churchData.secretario1SignatureUrl || churchData.secretarySignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      secretario1SignatureUrl: url,
                      secretario1SignatureFileName: fileName || "",
                      secretarySignatureUrl: url,
                      secretarySignatureFileName: fileName || ""
                    }))}
                  />
                </div>

                {/* 2º Secretário */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="secretario2" className="font-semibold text-sm text-foreground">2º Secretário(a)</Label>
                    <Input id="secretario2" value={churchData.secretario2 || ""} onChange={handleChange} placeholder="Nome completo do 2º Secretário(a)" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="secretario2Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="secretario2Telefone" value={churchData.secretario2Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="secretario2Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="secretario2Email" type="email" value={churchData.secretario2Email || ""} onChange={handleChange} placeholder="secretaria2@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (2º Secretário)"
                    helperText="Assinatura substituta da secretaria."
                    value={churchData.secretario2SignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      secretario2SignatureUrl: url,
                      secretario2SignatureFileName: fileName || ""
                    }))}
                  />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Tesouraria</h3>
              
              <div className="space-y-4">
                {/* 1º Tesoureiro */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="tesoureiro1" className="font-semibold text-sm text-foreground">1º Tesoureiro(a)</Label>
                    <Input id="tesoureiro1" value={churchData.tesoureiro1 || ""} onChange={handleChange} placeholder="Nome completo do 1º Tesoureiro(a)" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="tesoureiro1Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="tesoureiro1Telefone" value={churchData.tesoureiro1Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="tesoureiro1Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="tesoureiro1Email" type="email" value={churchData.tesoureiro1Email || ""} onChange={handleChange} placeholder="tesouraria1@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (1º Tesoureiro)"
                    helperText="Assinatura oficial para fechamentos, balanços, relatórios financeiros e recibos."
                    value={churchData.tesoureiro1SignatureUrl || churchData.tesoureiroSignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      tesoureiro1SignatureUrl: url,
                      tesoureiro1SignatureFileName: fileName || "",
                      tesoureiroSignatureUrl: url,
                      tesoureiroSignatureFileName: fileName || ""
                    }))}
                  />
                </div>

                {/* 2º Tesoureiro */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="tesoureiro2" className="font-semibold text-sm text-foreground">2º Tesoureiro(a)</Label>
                    <Input id="tesoureiro2" value={churchData.tesoureiro2 || ""} onChange={handleChange} placeholder="Nome completo do 2º Tesoureiro(a)" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="tesoureiro2Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="tesoureiro2Telefone" value={churchData.tesoureiro2Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="tesoureiro2Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="tesoureiro2Email" type="email" value={churchData.tesoureiro2Email || ""} onChange={handleChange} placeholder="tesouraria2@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (2º Tesoureiro)"
                    helperText="Assinatura substituta da diretoria financeira."
                    value={churchData.tesoureiro2SignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      tesoureiro2SignatureUrl: url,
                      tesoureiro2SignatureFileName: fileName || ""
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Conselho Fiscal (Fiscalização e Balanços) */}
            <div className="pt-6 mt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Conselho Fiscal</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Membros responsáveis pela conferência e assinatura de balancetes contábeis e fiscais.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* 1º Membro / Relator */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="conselhoFiscal1" className="font-semibold text-sm text-foreground">1º Membro do Conselho Fiscal (Presidente / Relator)</Label>
                    <Input id="conselhoFiscal1" value={churchData.conselhoFiscal1 || ""} onChange={handleChange} placeholder="Nome completo do 1º Membro / Relator" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="conselhoFiscal1Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="conselhoFiscal1Telefone" value={churchData.conselhoFiscal1Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="conselhoFiscal1Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="conselhoFiscal1Email" type="email" value={churchData.conselhoFiscal1Email || ""} onChange={handleChange} placeholder="conselho1@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (1º Membro / Relator do Conselho Fiscal)"
                    helperText="Assinatura para relatórios fiscais, balancetes e prestações de contas."
                    value={churchData.conselhoFiscal1SignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      conselhoFiscal1SignatureUrl: url,
                      conselhoFiscal1SignatureFileName: fileName || ""
                    }))}
                  />
                </div>

                {/* 2º Membro */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="conselhoFiscal2" className="font-semibold text-sm text-foreground">2º Membro do Conselho Fiscal</Label>
                    <Input id="conselhoFiscal2" value={churchData.conselhoFiscal2 || ""} onChange={handleChange} placeholder="Nome completo do 2º Membro" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="conselhoFiscal2Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="conselhoFiscal2Telefone" value={churchData.conselhoFiscal2Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="conselhoFiscal2Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="conselhoFiscal2Email" type="email" value={churchData.conselhoFiscal2Email || ""} onChange={handleChange} placeholder="conselho2@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (2º Membro do Conselho Fiscal)"
                    helperText="Assinatura conjunta do conselho fiscal."
                    value={churchData.conselhoFiscal2SignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      conselhoFiscal2SignatureUrl: url,
                      conselhoFiscal2SignatureFileName: fileName || ""
                    }))}
                  />
                </div>

                {/* 3º Membro */}
                <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                  <div className="space-y-1.5">
                    <Label htmlFor="conselhoFiscal3" className="font-semibold text-sm text-foreground">3º Membro do Conselho Fiscal</Label>
                    <Input id="conselhoFiscal3" value={churchData.conselhoFiscal3 || ""} onChange={handleChange} placeholder="Nome completo do 3º Membro" className="h-10 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                    <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                      <Label htmlFor="conselhoFiscal3Telefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                      <Input id="conselhoFiscal3Telefone" value={churchData.conselhoFiscal3Telefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                    </div>
                    <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                      <Label htmlFor="conselhoFiscal3Email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                      <Input id="conselhoFiscal3Email" type="email" value={churchData.conselhoFiscal3Email || ""} onChange={handleChange} placeholder="conselho3@igreja.com.br" className="h-10 text-sm w-full" />
                    </div>
                  </div>
                  <DigitalSignatureField
                    label="Assinatura Digital (3º Membro do Conselho Fiscal)"
                    helperText="Assinatura de homologação do conselho fiscal."
                    value={churchData.conselhoFiscal3SignatureUrl}
                    onChange={(url, fileName) => setChurchData(prev => ({
                      ...prev,
                      conselhoFiscal3SignatureUrl: url,
                      conselhoFiscal3SignatureFileName: fileName || ""
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Patrimônio & Zeladoria */}
            <div className="pt-6 mt-6 border-t border-border space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Patrimônio & Zeladoria</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Responsável pela gestão de bens, inventário patrimonial, manutenções e zeladoria da igreja.</p>
              </div>

              <div className="space-y-3 p-4 border rounded-xl bg-card/60 shadow-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="diretorPatrimonio" className="font-semibold text-sm text-foreground">Diretor(a) de Patrimônio</Label>
                  <Input id="diretorPatrimonio" value={churchData.diretorPatrimonio || ""} onChange={handleChange} placeholder="Nome completo do Diretor(a) de Patrimônio" className="h-10 text-sm" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                  <div className="sm:col-span-1 lg:col-span-5 space-y-1.5">
                    <Label htmlFor="diretorPatrimonioTelefone" className="text-xs font-medium text-muted-foreground">Celular / WhatsApp</Label>
                    <Input id="diretorPatrimonioTelefone" value={churchData.diretorPatrimonioTelefone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="h-10 text-sm" />
                  </div>
                  <div className="sm:col-span-1 lg:col-span-7 space-y-1.5">
                    <Label htmlFor="diretorPatrimonioEmail" className="text-xs font-medium text-muted-foreground">E-mail</Label>
                    <Input id="diretorPatrimonioEmail" type="email" value={churchData.diretorPatrimonioEmail || ""} onChange={handleChange} placeholder="patrimonio@igreja.com.br" className="h-10 text-sm w-full" />
                  </div>
                </div>
                <DigitalSignatureField
                  label="Assinatura Digital (Diretor(a) de Patrimônio)"
                  helperText="Assinatura oficial para laudos de vistoria, termos de cautela de bens, inventário e relatórios patrimoniais."
                  value={churchData.diretorPatrimonioSignatureUrl}
                  onChange={(url, fileName) => setChurchData(prev => ({
                    ...prev,
                    diretorPatrimonioSignatureUrl: url,
                    diretorPatrimonioSignatureFileName: fileName || ""
                  }))}
                />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Identidade Visual da Igreja</h3>
              <p className="text-xs text-muted-foreground">Insira o logotipo institucional que será exibido em todos os cabeçalhos timbrados de relatórios e documentos.</p>
              <div className="space-y-2">
                <Label htmlFor="logo">Logotipo Oficial da Igreja / Congregação</Label>
                <Input id="logo" type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setChurchData(prev => ({ ...prev, logoFileName: file.name, logoDataUrl: reader.result as string }))
                      toast.success("Logo selecionada!")
                    };
                    reader.readAsDataURL(file);
                  }
                }} />
                {churchData.logoFileName && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">Arquivo atual: {churchData.logoFileName}</p>
                    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center border border-border overflow-hidden p-2">
                       {churchData.logoDataUrl ? (
                         <img src={churchData.logoDataUrl} alt="Logo" className="w-full h-full object-contain" />
                       ) : (
                         <span className="text-xs text-muted-foreground text-center px-2">Imagem Selecionada</span>
                       )}
                    </div>
                  </div>
                )}
              </div>

              {/* Atalho Direto e Visual para Paleta de Cores e Aparência */}
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-card dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-card mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      Paletas de Cores & Aparência Visual
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                        10 Cores Eclesiásticas
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Alterne cores dos botões, menus, títulos e temas (Claro, Escuro, Sépia, Ardósia e Meia-Noite).
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/configuracoes?tab=geral")}
                  className="shrink-0 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/40 font-semibold text-xs"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                  Abrir Cores & Aparência
                </Button>
              </div>
            </div>
            <Button className="w-full sm:w-auto" onClick={handleSave}>Salvar Parâmetros</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 h-fit shadow-sm border border-border/70 rounded-2xl bg-card">
          <CardHeader>
            <CardTitle>Painel do Administrativo</CardTitle>
            <CardDescription>Configure a mensagem de Boas-Vindas ou Avisos Gerais que aparecerão no Dashboard para todos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mensagemAvisos">Mensagem / Aviso</Label>
              <Textarea 
                id="mensagemAvisos" 
                rows={5}
                value={churchData.mensagemAvisos} 
                onChange={handleChange} 
                placeholder="Insira a mensagem ou aviso importante para a tela inicial."
              />
              <p className="text-xs text-muted-foreground">Esta mensagem ficará em destaque no Dashboard principal.</p>
            </div>
            <Button className="w-full sm:w-auto" onClick={handleSave}>Salvar Avisos</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
