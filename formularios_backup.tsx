import { motion } from "motion/react";
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, FileText, Plus, Save, Trash2, Search, Check, History, User } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

export function Formularios() {
  const { user } = useAuth()
  const [formType, setFormType] = useState("relatorio-culto")
  const [churchData, setChurchData] = useState<any>({})
  const [sequenceNumber, setSequenceNumber] = useState(() => parseInt(localStorage.getItem("obpcSequenceNumber") || "0"))
  const [members, setMembers] = useState<any[]>([])
  
  // Auto-fill state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<any>(null)

  // Templates state
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [currentTemplateTitle, setCurrentTemplateTitle] = useState("")
  const [currentTemplateContent, setCurrentTemplateContent] = useState("")
  const [dynamicPrintContent, setDynamicPrintContent] = useState("")

  // Logs state
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const savedConfig = localStorage.getItem("churchConfig")
    if (savedConfig) setChurchData(JSON.parse(savedConfig))
    
    const savedMembers = localStorage.getItem("churchMembers")
    if (savedMembers) setMembers(JSON.parse(savedMembers))

    const savedTemplates = localStorage.getItem("churchTemplates")
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates))
    } else {
      // Default templates
      const defaults = [
        {
          id: "temp_1",
          title: "Carta de Transferência",
          content: "<p>Declaramos para os devidos fins que o(a) irmão(ã) <strong>[NOME_MEMBRO]</strong>, portador(a) do RG/CPF <strong>[DOCUMENTO]</strong>, membro desta igreja desde <strong>[DATA_BATISMO]</strong>, está sendo transferido(a) para outra congregação, estando em plena comunhão e sem restrições em nosso rol de membros.</p><p><br></p><p>Valparaíso, <strong>[DATA_ATUAL]</strong>.</p><p><br></p><p>_____________________________________</p><p>Pastor Presidente</p>"
        },
        {
          id: "temp_2",
          title: "Declaração de Batismo",
          content: "<p>Declaramos que o(a) Sr(a) <strong>[NOME_MEMBRO]</strong>, portador(a) do documento <strong>[DOCUMENTO]</strong>, desceu às águas batismais no dia <strong>[DATA_BATISMO]</strong> em nossa congregação.</p><p><br></p><p>Valparaíso, <strong>[DATA_ATUAL]</strong>.</p><p><br></p><p>_____________________________________</p><p>Secretaria</p>"
        }
      ]
      setTemplates(defaults)
      localStorage.setItem("churchTemplates", JSON.stringify(defaults))
    }

    const savedLogs = localStorage.getItem("churchFormLogs")
    if (savedLogs) setLogs(JSON.parse(savedLogs))
  }, [])

  const filteredMembers = members.filter(m => 
    (m.nome || m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.cpf?.includes(searchTerm)
  ).slice(0, 5)

  const logPrint = (documentName: string, memberName: string = "N/A") => {
    const newLog = {
      id: Date.now().toString(),
      document: documentName,
      member: memberName,
      date: new Date().toISOString(),
      user: user?.name || "Sistema"
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem("churchFormLogs", JSON.stringify(updatedLogs))
  }

  const handlePrintStandard = () => {
    logPrint(
      formType === 'relatorio-culto' ? 'Relatório de Culto (Em Branco)' : 'Recibo Padrão',
      selectedMember ? selectedMember.nome : 'N/A'
    )
    window.print()
    const newSeq = sequenceNumber + 1
    localStorage.setItem("obpcSequenceNumber", newSeq.toString())
    setSequenceNumber(newSeq)
  }

  const handlePrintDynamic = () => {
    if (!selectedTemplateId) {
      toast.error("Selecione um modelo primeiro.")
      return
    }
    const template = templates.find(t => t.id === selectedTemplateId)
    if (!template) return
    
    logPrint(`Documento Dinâmico: ${template.title}`, selectedMember ? selectedMember.nome : 'N/A')
    
    // Prepare content
    let content = template.content
    if (selectedMember) {
      content = content.replace(/\[NOME_MEMBRO\]/g, selectedMember.nome)
      content = content.replace(/\[DOCUMENTO\]/g, selectedMember.cpf || selectedMember.rg || 'Não informado')
      content = content.replace(/\[DATA_BATISMO\]/g, selectedMember.dataBatismo || 'Não informada')
    }
    content = content.replace(/\[NOME_MEMBRO\]/g, "___________________")
    content = content.replace(/\[DOCUMENTO\]/g, "___________________")
    content = content.replace(/\[DATA_BATISMO\]/g, "___________________")
    
    const today = new Date().toLocaleDateString('pt-BR')
    content = content.replace(/\[DATA_ATUAL\]/g, today)

    setDynamicPrintContent(content)
    
    // Slight delay to allow DOM to update before printing
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const saveTemplate = () => {
    if (!currentTemplateTitle) {
      toast.error("O modelo precisa de um título.")
      return
    }
    
    let updatedTemplates = [...templates]
    
    if (selectedTemplateId && isEditingTemplate) {
      updatedTemplates = updatedTemplates.map(t => 
        t.id === selectedTemplateId 
          ? { ...t, title: currentTemplateTitle, content: currentTemplateContent } 
          : t
      )
      toast.success("Modelo atualizado com sucesso!")
    } else {
      const newTemp = {
        id: "temp_" + Date.now(),
        title: currentTemplateTitle,
        content: currentTemplateContent
      }
      updatedTemplates.push(newTemp)
      setSelectedTemplateId(newTemp.id)
      toast.success("Modelo criado com sucesso!")
    }
    
    setTemplates(updatedTemplates)
    localStorage.setItem("churchTemplates", JSON.stringify(updatedTemplates))
    setIsEditingTemplate(false)
  }

  const deleteTemplate = () => {
    if(!selectedTemplateId) return
    const updated = templates.filter(t => t.id !== selectedTemplateId)
    setTemplates(updated)
    localStorage.setItem("churchTemplates", JSON.stringify(updated))
    setSelectedTemplateId("")
    setCurrentTemplateTitle("")
    setCurrentTemplateContent("")
    setIsEditingTemplate(false)
    toast.success("Modelo excluído.")
  }

  const renderRelatorioCulto = () => {
    return (
      <div id="printable-standard" className="w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] mx-auto text-[10px] font-sans print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
            @page { size: A4 portrait; margin: 5mm; }
            ::-webkit-scrollbar { display: none; }
          }
        `}</style>
        
        <div className="border-2 border-black h-full flex flex-col">
          {/* Header */}
          <div className="flex border-b-2 border-black h-[22mm]">
            <div className="w-[25mm] border-r-2 border-black flex items-center justify-center p-1">
              {churchData.logoDataUrl ? (
                <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>AQUI</div>
              )}
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
              <h1 className="font-bold text-[14px] leading-tight uppercase max-w-[130mm]">{churchData.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}</h1>
              <p className="text-[9px] uppercase mt-1">{churchData.endereco ? `${churchData.endereco}${churchData.cidade ? ' - '+churchData.cidade : ''}` : "RUA EDUARDO GERALDI, 300 - VALPARAÍSO - SP"} | CNPJ: {churchData.cnpj || "51.105.484/0001-74"}</p>
              <div className="border border-black bg-gray-200 font-bold px-4 py-0.5 mt-2 text-[12px] uppercase">
                RELATÓRIO DE CULTO - FINANCEIRO
              </div>
            </div>
            <div className="w-[35mm] border-l-2 border-black flex flex-col items-center justify-center font-bold tracking-widest leading-none">
              <span className="text-[22px] mb-1">OBPC</span>
              <span className="text-red-600 font-black text-[16px] tracking-normal">Nº {String(sequenceNumber + 1).padStart(5, '0')}</span>
            </div>
          </div>

          {/* Row 1 */}
          <div className="flex border-b border-black min-h-[8mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Igreja / Congregação (Cidade/Bairro)</span>
              <div className="mt-2 ml-1 text-[10px]"></div>
            </div>
            <div className="w-[30mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Data</span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex border-b border-black min-h-[8mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Pastor ou Responsável pela Igreja / Congregação</span>
              <div className="mt-2 ml-1 text-[10px]"></div>
            </div>
            <div className="w-[30mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">RM</span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex border-b border-black min-h-[8mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Tipo de Culto realizado</span>
            </div>
            <div className="w-[90mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Pregador(a)</span>
            </div>
          </div>

          {/* Row 4 - Checkboxes & Stats */}
          <div className="flex border-b border-black">
            <div className="flex-1 flex flex-col">
               <div className="text-center font-bold text-[8px] py-0.5 border-b border-black">Dia da Semana (Marque com um "X")</div>
               <div className="flex justify-around items-center py-1.5 px-2">
                 {['SEG','TER','QUA','QUI','SEX','SAB','DOM'].map(d => (
                   <div key={d} className="flex flex-col items-center gap-0.5">
                     <div className="border border-black w-5 h-4"></div>
                     <span className="text-[7px] font-bold">{d}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="w-[20mm] border-l border-r border-black relative">
               <span className="absolute top-0.5 left-1 font-bold text-[8px]">Horário</span>
            </div>
            <div className="w-[70mm] grid grid-cols-2">
               <div className="border-r border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Testemunho Cura</span><span>&rarr;</span></div>
               <div className="border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Conversões</span><span>&rarr;</span></div>
               <div className="border-r border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Batismo / Esp. Santo</span><span>&rarr;</span></div>
               <div className="border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Visitantes</span><span>&rarr;</span></div>
               <div className="border-r border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Crianças Apresent.</span><span>&rarr;</span></div>
               <div className="p-1 flex justify-between items-center text-[8px] font-bold bg-gray-100"><span className="leading-none">TOTAL PRESENTES</span><span>&rarr;</span></div>
            </div>
          </div>

          {/* Row 5 */}
          <div className="flex border-b border-black min-h-[6mm]">
            <div className="w-[120mm] border-r border-black p-1 font-bold text-[8px] text-right flex items-center justify-end">Diácon(os) (isas) em serviço &rarr;</div>
            <div className="flex-1"></div>
          </div>
          
          {/* Row 6 */}
          <div className="flex border-b-2 border-black min-h-[6mm] bg-gray-50">
            <div className="w-[120mm] border-r border-black p-1 font-bold text-[8px] text-center flex items-center justify-center">PASTORES / PRESBÍTEROS / MISS. / EVANGELISTAS PRESENTES</div>
            <div className="flex-1 p-1 font-bold text-[8px] text-center flex items-center justify-center">VISITAS ESPECIAIS</div>
          </div>
          <div className="flex border-b-2 border-black min-h-[8mm]">
             <div className="w-[120mm] border-r border-black"></div>
             <div className="flex-1"></div>
          </div>

          {/* Demonstrativo de Arrecadacoes */}
          <div className="text-center font-bold text-[10px] py-1 border-b-2 border-black bg-gray-100">DEMONSTRATIVO DE ARRECADAÇÕES</div>
          <div className="grid grid-cols-3">
             <div className="flex border-b border-r border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">01</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Dízimos</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black"></div>
             </div>
             <div className="flex border-b border-r border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">03</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Ofertas Especiais</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black"></div>
             </div>
             <div className="flex border-b border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">05</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Ofertas de Missões</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black bg-gray-100"></div>
             </div>
             <div className="flex border-b border-r border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">02</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Ofertas Gerais</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black"></div>
             </div>
             <div className="flex border-b border-r border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">04</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Ofertas Proj. Neemias</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black bg-gray-100"></div>
             </div>
             <div className="flex border-b border-black">
                <div className="w-6 border-r border-black text-center font-bold flex items-center justify-center">06</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[9px]"><span>Outras Entradas</span><span>&rarr;</span></div>
                <div className="w-[20mm] border-l border-black"></div>
             </div>
          </div>
          <div className="flex border-b-2 border-black min-h-[6mm] bg-gray-100">
             <div className="flex-1 text-right pr-2 font-bold text-[9px] flex items-center justify-end uppercase">
                TOTAL DE ARRECADAÇÕES (não soma Ofertas Missões e Projeto Neemias) &rarr;
             </div>
             <div className="w-[20mm] border-l border-black bg-white"></div>
          </div>

          {/* Relação dos Dizimistas */}
          <div className="text-center font-bold text-[10px] py-1 border-b-2 border-black bg-gray-100">RELAÇÃO DOS DIZIMISTAS DO CULTO</div>
          <div className="flex border-b-2 border-black font-bold text-[9px] text-center">
             <div className="w-6 border-r border-black py-0.5">ÍTEM</div>
             <div className="flex-1 border-r border-black py-0.5">NOME DOS DIZIMISTAS</div>
             <div className="w-[25mm] border-r border-black py-0.5">Nº CHEQUE</div>
             <div className="w-[25mm] border-r border-black py-0.5">BANCO</div>
             <div className="w-[30mm] py-0.5">VALOR</div>
          </div>
          
          {[...Array(20)].map((_, i) => (
             <div key={i} className="flex border-b border-black min-h-[4.5mm]">
               <div className="w-6 border-r border-black text-center font-bold text-[8px] flex items-center justify-center">{String(i+1).padStart(2, '0')}</div>
               <div className="flex-1 border-r border-black p-0.5 px-2 text-[9px]">{i === 0 && selectedMember ? selectedMember.nome : ""}</div>
               <div className="w-[25mm] border-r border-black"></div>
               <div className="w-[25mm] border-r border-black"></div>
               <div className="w-[30mm]"></div>
             </div>
          ))}

          {/* Assinaturas */}
          <div className="flex border-b-2 border-t border-black bg-gray-100">
             <div className="w-1/2 border-r border-black font-bold text-center py-1 text-[9px]">NOMES DOS DIÁCON(OS)(ISAS) RESPONSÁVEIS</div>
             <div className="w-1/2 font-bold text-center py-1 text-[9px]">ASSINATURAS</div>
          </div>
          {[...Array(3)].map((_, i) => (
             <div key={i} className="flex border-b border-black min-h-[6mm]">
               <div className="w-1/2 border-r border-black"></div>
               <div className="w-1/2"></div>
             </div>
          ))}

          {/* Destino da Arrecadacao */}
          <div className="text-center font-bold text-[10px] py-1 border-b-2 border-black bg-gray-100">DESTINO DA ARRECADAÇÃO</div>
          
          <div className="flex border-b-2 border-black">
             <div className="w-1/2 border-r border-black p-1 relative min-h-[8mm]">
               <span className="absolute top-0.5 left-1 font-bold text-[8px]">Nome Tesoureiro ou Responsável</span>
               <div className="mt-3 ml-1 text-[9px]">{churchData.tesoureiro1 || ""}</div>
             </div>
             <div className="w-1/2 p-1 relative min-h-[8mm]">
               <span className="absolute top-0.5 left-1 font-bold text-[8px]">Assinatura</span>
             </div>
          </div>

          <div className="flex flex-1">
             <div className="w-1/2 flex flex-col border-r-2 border-black">
                <div className="flex-1 border-b border-black text-center font-bold text-[12px] flex items-center justify-center">
                   CAIXA LOCAL
                </div>
                <div className="flex-1 relative p-1">
                   <span className="absolute top-0.5 left-1 font-bold text-[8px]">Valor</span>
                </div>
             </div>
             
             <div className="w-1/2 flex">
                <div className="w-[25mm] border-r border-black flex items-center justify-center text-center font-bold text-[8px]">
                   CONTA<br/>CORRENTE<br/>DA IGREJA
                </div>
                <div className="flex-1 flex flex-col">
                   <div className="flex flex-1 border-b border-black">
                      <div className="flex-1 border-r border-black p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Banco</span>
                      </div>
                      <div className="w-[15mm] border-r border-black p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Agência</span>
                      </div>
                      <div className="w-[25mm] p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Valor</span>
                      </div>
                   </div>
                   <div className="flex flex-1">
                      <div className="flex-1 border-r border-black p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Banco</span>
                      </div>
                      <div className="w-[15mm] border-r border-black p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Agência</span>
                      </div>
                      <div className="w-[25mm] p-1 relative">
                         <span className="absolute top-0 left-1 font-bold text-[7px]">Valor</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
        <div className="text-[8px] font-bold mt-1">
           1ª Via Tesouraria / 2ª Via Igreja
        </div>
      </div>
    );
  }

  const renderRecibo = () => {
    return (
      <div id="printable-standard" className="w-[210mm] min-h-[297mm] bg-white text-black p-[10mm] mx-auto text-[12px] font-sans print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
            @page { size: A4 portrait; margin: 5mm; }
            ::-webkit-scrollbar { display: none; }
          }
        `}</style>
        
        <div className="flex flex-col gap-8">
           {[...Array(2)].map((_, idx) => (
             <div key={idx} className="border-2 border-black rounded-xl p-4 flex flex-col gap-4">
                {/* Header Recibo */}
                <div className="flex justify-between items-center gap-4">
                   <div className="w-[30mm] h-[25mm] border-2 border-black rounded-xl flex items-center justify-center p-2">
                     {churchData.logoDataUrl ? (
                        <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                     ) : (
                        <div className="text-center font-bold text-[10px] leading-tight">LOGO<br/>AQUI</div>
                     )}
                   </div>
                   <div className="flex-1 text-center">
                      <h2 className="font-bold text-[16px] uppercase">{churchData.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}</h2>
                      <p className="text-[10px] uppercase font-bold mt-1">CNPJ: {churchData.cnpj || "51.105.484/0001-74"}</p>
                      <p className="text-[10px] uppercase font-bold">{churchData.endereco ? `${churchData.endereco}${churchData.cidade ? ' - '+churchData.cidade : ''}` : "RUA EDUARDO GERALDI, 300 - VALPARAÍSO - SP"}</p>
                   </div>
                   <div className="flex flex-col gap-2">
                      <div className="border-2 border-black rounded-xl w-[40mm] py-1 text-center font-black text-2xl tracking-widest bg-gray-100">
                         RECIBO
                      </div>
                      <div className="border-2 border-black rounded-xl w-[40mm] py-1 flex flex-col items-center justify-center font-bold tracking-widest leading-none">
                         <span className="text-[22px] mb-1">OBPC</span>
                         <span className="text-red-600 font-black text-[16px] tracking-normal">Nº {String(sequenceNumber + 1).padStart(5, '0')}</span>
                      </div>
                   </div>
                </div>

                {/* Body Recibo */}
                <div className="flex flex-col gap-3 mt-2">
                   <div className="flex gap-2 items-center">
                      <div className="border-2 border-black rounded-xl px-3 py-1.5 font-bold whitespace-nowrap bg-gray-100">
                         IGREJA / CONGREGAÇÃO
                      </div>
                      <div className="border-2 border-black rounded-xl flex-1 h-[9mm] flex items-center px-3 font-bold">
                         
                      </div>
                   </div>
                   <div className="flex gap-2 items-center">
                      <div className="border-2 border-black rounded-xl px-3 py-1.5 w-[45mm] text-right font-bold bg-gray-100">
                         VALOR - R$
                      </div>
                      <div className="border-2 border-black rounded-xl w-[50mm] h-[9mm]"></div>
                   </div>
                   <div className="flex gap-2 items-center">
                      <div className="border-2 border-black rounded-xl px-3 py-1.5 w-[45mm] text-right font-bold bg-gray-100">
                         VALOR POR EXTENSO
                      </div>
                      <div className="border-2 border-black rounded-xl flex-1 h-[9mm]"></div>
                   </div>
                   <div className="border-2 border-black rounded-xl p-2 min-h-[25mm] relative mt-2">
                      <span className="font-bold text-[14px]">Referente:</span>
                   </div>
                </div>

                {/* Footer Recibo */}
                <div className="mt-4 flex flex-col gap-4 text-[14px]">
                   <div className="flex gap-2 items-end">
                      <span className="font-bold">Nome:</span>
                      <div className="flex-1 border-b border-black border-dashed flex items-end px-2 text-[14px] font-bold h-6">
                         
                      </div>
                      <span className="font-bold">CPF/RG:</span>
                      <div className="w-[40mm] border-b border-black border-dashed flex items-end px-2 text-[14px] font-bold h-6">
                         
                      </div>
                   </div>
                   <div className="text-center font-bold my-2 text-[13px]">
                      Recebi(emos) da {churchData.nome || "Igreja Pentecostal \"O Brasil para Cristo\""} a importância acima citada.<br/>
                      Pela clareza firmo(amos) o presente.
                   </div>
                   <div className="flex justify-between items-end mt-8 pb-2 px-4 text-[13px] font-bold">
                      <div className="flex flex-col items-center w-[60mm]">
                         <div className="w-full border-b border-black h-4"></div>
                         <span className="mt-1">Assinatura</span>
                      </div>
                      <div className="flex flex-col items-center w-[30mm]">
                         <div className="w-full border-b border-black h-4"></div>
                         <span className="mt-1">Data</span>
                      </div>
                      <div className="flex flex-col items-center w-[60mm]">
                         <div className="w-full border-b border-black h-4 text-center text-[10px] font-normal leading-none mb-0.5">
                            
                         </div>
                         <span className="mt-1">Tesoureiro ou Responsável</span>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  const renderDynamicDocument = () => {
    return (
      <div id="printable-dynamic" className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] mx-auto font-serif print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-dynamic, #printable-dynamic * { visibility: visible; }
            #printable-dynamic { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; }
            @page { size: A4 portrait; margin: 15mm; }
            ::-webkit-scrollbar { display: none; }
          }
        `}</style>
        
        {/* Simple Header for dynamic documents */}
        <div className="flex items-center justify-center gap-6 border-b-2 border-black pb-6 mb-10">
           {churchData.logoDataUrl && (
             <img src={churchData.logoDataUrl} alt="Logo" className="h-20 object-contain" />
           )}
           <div className="text-center">
             <h1 className="text-2xl font-bold uppercase">{churchData.nome || "Igreja Evangélica"}</h1>
             <p className="text-sm">{churchData.endereco ? `${churchData.endereco}${churchData.cidade ? ' - '+churchData.cidade : ''}` : ""}</p>
             <p className="text-sm">CNPJ: {churchData.cnpj || "00.000.000/0000-00"}</p>
           </div>
        </div>

        {/* Content */}
        <div 
          className="text-lg leading-relaxed text-justify space-y-4"
          dangerouslySetInnerHTML={{ __html: dynamicPrintContent }} 
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formulários e Documentos</h1>
          <p className="text-muted-foreground">Emissão de blocos padronizados e cartas/declarações dinâmicas.</p>
        </div>
      </div>

      <Tabs defaultValue="padroes" className="print:hidden space-y-6">
        <TabsList>
          <TabsTrigger value="padroes">Formulários Padrão</TabsTrigger>
          <TabsTrigger value="dinamicos">Documentos & Declarações</TabsTrigger>
          <TabsTrigger value="logs">Logs de Emissão</TabsTrigger>
        </TabsList>

        <TabsContent value="padroes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Impressão Padrão</CardTitle>
              <CardDescription>Escolha o formulário e opcionalmente um membro para preenchimento automático.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <Label>Próximo Nº Sequencial (Relatório/Recibo)</Label>
                  <Input 
                    type="number" 
                    value={sequenceNumber + 1} 
                    onChange={(e) => setSequenceNumber(parseInt(e.target.value) - 1 || 0)}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">Altere para ajustar a partir de qual número o próximo será emitido.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Tipo de Formulário</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relatorio-culto">Relatório de Culto Financeiro (A4)</SelectItem>
                      <SelectItem value="recibo">Recibo Padrão (2 por página)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Vincular a um Membro (Opcional - Preenchimento Auto)</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="search" 
                      placeholder="Buscar por nome ou CPF..." 
                      className="pl-8" 
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setSelectedMember(null)
                      }}
                    />
                  </div>
                  {searchTerm && !selectedMember && (
                    <div className="absolute z-10 w-full max-w-md bg-white border rounded-md shadow-lg mt-1 p-2 max-h-60 overflow-auto">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map(m => (
                          <div 
                            key={m.id} 
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded flex justify-between items-center"
                            onClick={() => {
                              setSelectedMember(m)
                              setSearchTerm(m.nome)
                            }}
                          >
                            <span>{m.nome}</span>
                            <span className="text-xs text-gray-500">{m.cpf}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">Nenhum membro encontrado.</div>
                      )}
                    </div>
                  )}
                  {selectedMember && (
                    <div className="flex items-center text-sm text-green-600 mt-2">
                      <Check className="h-4 w-4 mr-1" /> Membro selecionado para preenchimento.
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={handlePrintStandard}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Formulário
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-auto bg-gray-100 p-4 rounded-xl border border-gray-200 flex justify-center">
             {formType === 'relatorio-culto' && renderRelatorioCulto()}
             {formType === 'recibo' && renderRecibo()}
          </div>
        </TabsContent>

        <TabsContent value="dinamicos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Dinâmicos</CardTitle>
              <CardDescription>Crie modelos como Cartas de Transferência e preencha automaticamente os dados do membro na hora de imprimir.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                
                {/* Sidebar of templates */}
                <div className="space-y-4 border-r pr-6">
                   <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Meus Modelos</h3>
                      <Button variant="outline" size="icon" onClick={() => {
                         setSelectedTemplateId("")
                         setCurrentTemplateTitle("")
                         setCurrentTemplateContent("")
                         setIsEditingTemplate(true)
                      }}>
                         <Plus className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="space-y-2">
                      {templates.map(t => (
                         <div 
                           key={t.id} 
                           className={`p-3 text-sm rounded-md cursor-pointer border transition-colors ${selectedTemplateId === t.id ? 'bg-primary/10 border-primary font-medium' : 'hover:bg-muted'}`}
                           onClick={() => {
                              setSelectedTemplateId(t.id)
                              setCurrentTemplateTitle(t.title)
                              setCurrentTemplateContent(t.content)
                              setIsEditingTemplate(false)
                           }}
                         >
                            <FileText className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                            {t.title}
                         </div>
                      ))}
                      {templates.length === 0 && <p className="text-xs text-muted-foreground">Nenhum modelo criado.</p>}
                   </div>
                </div>

                {/* Editor / Viewer */}
                <div className="space-y-6">
                   {selectedTemplateId || isEditingTemplate ? (
                      <div className="space-y-4">
                         {isEditingTemplate ? (
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <Label>Título do Modelo</Label>
                                  <Input 
                                    value={currentTemplateTitle} 
                                    onChange={(e) => setCurrentTemplateTitle(e.target.value)} 
                                    placeholder="Ex: Carta de Apresentação"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <Label>Conteúdo do Modelo</Label>
                                  <p className="text-xs text-muted-foreground mb-2">
                                     Variáveis disponíveis que serão trocadas na impressão: <br/>
                                     <code className="bg-muted px-1 py-0.5 rounded">[NOME_MEMBRO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DOCUMENTO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DATA_BATISMO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DATA_ATUAL]</code>
                                  </p>
                                  <div className="bg-white">
                                     <ReactQuill 
                                        theme="snow" 
                                        value={currentTemplateContent} 
                                        onChange={setCurrentTemplateContent} 
                                        className="h-64 mb-12"
                                     />
                                  </div>
                               </div>
                               <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" onClick={() => setIsEditingTemplate(false)}>Cancelar</Button>
                                  <Button onClick={saveTemplate}><Save className="h-4 w-4 mr-2"/> Salvar Modelo</Button>
                               </div>
                            </div>
                         ) : (
                            <div className="space-y-4">
                               <div className="flex justify-between items-center">
                                  <h2 className="text-xl font-semibold">{currentTemplateTitle}</h2>
                                  <div className="flex gap-2">
                                     <Button variant="outline" size="sm" onClick={() => setIsEditingTemplate(true)}>Editar</Button>
                                     <Button variant="destructive" size="sm" onClick={deleteTemplate}><Trash2 className="h-4 w-4"/></Button>
                                  </div>
                               </div>
                               
                               <div className="bg-muted/30 p-4 rounded-xl border border-dashed">
                                  <h4 className="text-sm font-medium mb-4 flex items-center"><Printer className="h-4 w-4 mr-2"/> Preparar Impressão</h4>
                                  <div className="space-y-4 max-w-md">
                                     <div className="space-y-2">
                                       <Label>Membro Solicitante (Preenchimento Automático)</Label>
                                       <div className="relative">
                                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                         <Input 
                                           type="search" 
                                           placeholder="Buscar por nome ou CPF..." 
                                           className="pl-8 bg-white" 
                                           value={searchTerm}
                                           onChange={(e) => {
                                             setSearchTerm(e.target.value)
                                             setSelectedMember(null)
                                           }}
                                         />
                                       </div>
                                       {searchTerm && !selectedMember && (
                                         <div className="absolute z-10 w-full max-w-md bg-white border rounded-md shadow-lg mt-1 p-2 max-h-60 overflow-auto">
                                           {filteredMembers.length > 0 ? (
                                             filteredMembers.map(m => (
                                               <div 
                                                 key={m.id} 
                                                 className="p-2 hover:bg-gray-100 cursor-pointer rounded flex justify-between items-center"
                                                 onClick={() => {
                                                   setSelectedMember(m)
                                                   setSearchTerm(m.nome)
                                                 }}
                                               >
                                                 <span>{m.nome}</span>
                                                 <span className="text-xs text-gray-500">{m.cpf}</span>
                                               </div>
                                             ))
                                           ) : (
                                             <div className="p-2 text-sm text-gray-500">Nenhum membro encontrado.</div>
                                           )}
                                         </div>
                                       )}
                                     </div>
                                     <Button className="w-full" onClick={handlePrintDynamic}>
                                        <Printer className="mr-2 h-4 w-4"/> Imprimir Documento
                                     </Button>
                                  </div>
                               </div>

                               <div className="border rounded-md p-4 bg-white prose max-w-none text-sm opacity-70" dangerouslySetInnerHTML={{__html: currentTemplateContent}}></div>
                            </div>
                         )}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-20 border-2 border-dashed rounded-xl">
                         <FileText className="h-12 w-12 opacity-20" />
                         <p>Selecione um modelo ao lado ou crie um novo.</p>
                      </div>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Hidden print area container */}
          <div className="hidden">
             {renderDynamicDocument()}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Emissões</CardTitle>
              <CardDescription>Registro de todos os formulários e documentos emitidos pelo sistema.</CardDescription>
            </CardHeader>
            <CardContent>
               {logs.length > 0 ? (
                 <div className="border rounded-md divide-y">
                   {logs.map(log => (
                     <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="bg-primary/10 p-2 rounded-full">
                            <History className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                            <p className="font-medium">{log.document}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                               <User className="h-3 w-3" /> Membro Referência: {log.member}
                            </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm font-medium">{new Date(log.date).toLocaleString('pt-BR')}</p>
                         <p className="text-xs text-muted-foreground">Emitido por: {log.user}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-12 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma emissão registrada ainda.</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
