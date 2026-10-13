import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Users } from "lucide-react";
import { toast } from "sonner";

interface Seat {
  id: string;
  row: number;
  col: number;
  status: "available" | "reserved" | "occupied";
  occupant?: string;
}

export function SeatMap() {
  const [seats, setSeats] = useState<Seat[]>(() => {
    const s = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 10; c++) {
        // Leave a gap for the aisle
        if (c === 4 || c === 5) continue;
        s.push({
          id: `R${r}-C${c}`,
          row: r,
          col: c,
          status: "available"
        });
      }
    }
    return s;
  });
  
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const handleSeatClick = (id: string) => {
    setSeats(seats.map(s => {
      if (s.id === id) {
        let nextStatus: Seat["status"] = "available";
        if (s.status === "available") nextStatus = "reserved";
        else if (s.status === "reserved") nextStatus = "occupied";
        return { ...s, status: nextStatus };
      }
      return s;
    }));
    toast.success("Status do assento atualizado");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Assentos - Templo Principal</CardTitle>
          <CardDescription>
            Organize a disposição de membros e visitantes. Clique nos assentos para alterar o status (Disponível → Reservado → Ocupado).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-8 justify-center">
             <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded bg-slate-200"></div> Disponível</div>
             <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded bg-amber-400"></div> Reservado</div>
             <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded bg-emerald-500"></div> Ocupado</div>
          </div>
          
          <div className="max-w-2xl mx-auto bg-slate-50 p-8 rounded-xl border">
             {/* Altar representation */}
             <div className="w-2/3 mx-auto h-16 bg-slate-300 rounded-lg flex items-center justify-center font-bold text-slate-500 mb-12">
               ALTAR / PÚLPITO
             </div>
             
             {/* Seats grid */}
             <div className="grid gap-y-4">
               {[0, 1, 2, 3, 4].map(row => (
                 <div key={`row-${row}`} className="flex justify-between">
                   {/* Left Block */}
                   <div className="flex gap-2">
                     {[0, 1, 2, 3].map(col => {
                       const seat = seats.find(s => s.row === row && s.col === col);
                       return seat ? (
                         <button 
                           key={seat.id}
                           onClick={() => handleSeatClick(seat.id)}
                           className={`w-10 h-10 md:w-12 md:h-12 rounded-t-lg rounded-b flex items-center justify-center transition-colors ${
                             seat.status === 'available' ? 'bg-slate-200 hover:bg-slate-300' :
                             seat.status === 'reserved' ? 'bg-amber-400 text-amber-900' :
                             'bg-emerald-500 text-white'
                           }`}
                           title={`Fileira ${row+1}, Cadeira ${col+1} - ${seat.status}`}
                         >
                           <User className="w-5 h-5 opacity-60" />
                         </button>
                       ) : null;
                     })}
                   </div>
                   
                   {/* Aisle */}
                   <div className="w-16 flex items-center justify-center text-xs text-slate-300">
                     Corredor
                   </div>
                   
                   {/* Right Block */}
                   <div className="flex gap-2">
                     {[6, 7, 8, 9].map(col => {
                       const seat = seats.find(s => s.row === row && s.col === col);
                       return seat ? (
                         <button 
                           key={seat.id}
                           onClick={() => handleSeatClick(seat.id)}
                           className={`w-10 h-10 md:w-12 md:h-12 rounded-t-lg rounded-b flex items-center justify-center transition-colors ${
                             seat.status === 'available' ? 'bg-slate-200 hover:bg-slate-300' :
                             seat.status === 'reserved' ? 'bg-amber-400 text-amber-900' :
                             'bg-emerald-500 text-white'
                           }`}
                           title={`Fileira ${row+1}, Cadeira ${col-1} - ${seat.status}`}
                         >
                           <User className="w-5 h-5 opacity-60" />
                         </button>
                       ) : null;
                     })}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
