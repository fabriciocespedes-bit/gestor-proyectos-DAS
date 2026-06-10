import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AiTools } from './ai.tools';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

@Injectable()
export class AiService {
  private readonly log = new Logger('AI');
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pregunta en lenguaje natural. El modelo decide qué herramientas llamar
   * (function-calling); ejecutamos las funciones bajo RLS y devolvemos la
   * respuesta + las acciones sugeridas. Sin API key → fallback determinista.
   */
  async ask(question: string, userId: string) {
    const tools = new AiTools(this.prisma);
    if (!process.env.OPENAI_API_KEY) {
      return this.deterministicFallback(question, userId, tools);
    }

    const messages: any[] = [
      {
        role: 'system',
        content:
          'Eres el asistente de productividad de ProjectOS. Responde en español, ' +
          'breve y accionable. Usa las herramientas para obtener datos reales antes ' +
          'de afirmar nada. Nunca inventes cifras.',
      },
      { role: 'user', content: question },
    ];

    // Ronda 1: el modelo pide herramientas.
    let res = await this.call(messages, AiTools.schema());
    let msg = res.choices?.[0]?.message;

    if (msg?.tool_calls?.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        const args = safeParse(tc.function.arguments);
        if (!args.userId && /user/.test(tc.function.name)) args.userId = userId;
        const out = await tools.run(tc.function.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(out),
        });
      }
      // Ronda 2: el modelo redacta con los resultados.
      res = await this.call(messages);
      msg = res.choices?.[0]?.message;
    }

    return { answer: msg?.content ?? 'Sin respuesta', model: MODEL };
  }

  /** Atajos deterministas (también usados como fallback sin API key). */
  planWeek(userId: string) {
    return new AiTools(this.prisma).run('plan_week', { userId });
  }
  risks(projectId: string) {
    return new AiTools(this.prisma).run('get_project_risk', { projectId });
  }
  bottlenecks(projectId: string) {
    return new AiTools(this.prisma).run('find_bottlenecks', { projectId });
  }

  private async call(messages: any[], tools?: any[]) {
    const body: any = { model: MODEL, messages, temperature: 0.2 };
    if (tools) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      this.log.error(`OpenAI ${r.status}: ${await r.text()}`);
      throw new Error('Fallo al consultar el modelo');
    }
    return r.json() as Promise<any>;
  }

  /** Sin API key: detecta la intención por palabras clave y responde con datos reales. */
  private async deterministicFallback(q: string, userId: string, tools: AiTools) {
    const t = q.toLowerCase();
    if (t.includes('atras')) {
      const r: any = await tools.run('get_overdue', {});
      return { answer: `Hay ${r.count} ítems atrasados. Prioriza los de mayor score.`, data: r };
    }
    if (t.includes('hoy') || t.includes('hacer')) {
      const r = await tools.run('get_today_tasks', { userId });
      return { answer: 'Tu foco de hoy, ordenado por prioridad:', data: r };
    }
    if (t.includes('riesgo')) {
      return { answer: 'Indica el proyecto para evaluar su riesgo.', hint: 'usa /ai/risks?projectId=' };
    }
    if (t.includes('semana') || t.includes('planific')) {
      const r = await tools.run('plan_week', { userId });
      return { answer: 'Propuesta de timeboxes para tu semana:', data: r };
    }
    return {
      answer:
        'Puedo ayudarte con: qué está atrasado, qué hacer hoy, riesgo de un proyecto, ' +
        'cuellos de botella y planificar tu semana. (Define OPENAI_API_KEY para respuestas libres.)',
    };
  }
}

const safeParse = (s: string) => {
  try {
    return JSON.parse(s || '{}');
  } catch {
    return {};
  }
};
