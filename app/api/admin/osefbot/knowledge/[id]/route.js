import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function admin(){const s=await getServerSession(authOptions);return s?.user?.role==="ADMIN";}
export async function PATCH(req,{params}) {
 if(!(await admin())) return NextResponse.json({error:"Accès refusé."},{status:403});
 const b=await req.json().catch(()=>({})); const data={};
 if(typeof b.questionReference==="string"){const v=b.questionReference.trim().slice(0,600);if(!v)return NextResponse.json({error:"Question obligatoire."},{status:400});data.questionReference=v}
 if(typeof b.reponse==="string"){const v=b.reponse.trim().slice(0,4000);if(!v)return NextResponse.json({error:"Réponse obligatoire."},{status:400});data.reponse=v}
 if(Array.isArray(b.formulations))data.formulations=b.formulations.map(x=>String(x).trim().slice(0,600)).filter(Boolean).slice(0,20);
 if(typeof b.actif==="boolean")data.actif=b.actif;
 if("actionHref" in b){const href=String(b.actionHref||"").trim().slice(0,200)||null;if(href&&(!href.startsWith("/")||href.startsWith("//")))return NextResponse.json({error:"Destination interne invalide."},{status:400});data.actionHref=href;data.actionLabel=href?(String(b.actionLabel||"").trim().slice(0,80)||"Ouvrir"):null}
 const k=await prisma.osefBotKnowledge.update({where:{id:params.id},data}); return NextResponse.json({ok:true,id:k.id});
}
export async function DELETE(req,{params}) {
 if(!(await admin())) return NextResponse.json({error:"Accès refusé."},{status:403});
 await prisma.osefBotKnowledge.delete({where:{id:params.id}}); return NextResponse.json({ok:true});
}
