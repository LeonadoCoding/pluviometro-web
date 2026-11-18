import React, { useState } from 'react';
import { UserPlus, MessageCircle, Mail, ArrowUpRight, Copy, Check } from 'lucide-react';
import Modal from './ui/Modal';

// Administrador que libera os acessos ao Pluviômetro
const ADMIN = {
  whatsapp: '5577999236276',
  whatsappLabel: '(77) 99923-6276',
  email: 'leonardo.barros@sementesoilema.com.br'
};

function message(email) {
  const who = email ? ` Meu e-mail é ${email}.` : '';
  return `Olá! Gostaria de pedir acesso ao Pluviômetro da UBS Placas (Sementes Oilema).${who}`;
}

function Channel({ href, icon: Icon, tone, title, detail, index }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3.5 rounded-lg border border-line bg-surface px-4 py-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:border-[rgba(242,131,34,.55)] hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[.99] [animation:fade-up_.32s_cubic-bezier(.2,.8,.2,1)_both]"
      style={{ animationDelay: `${80 + index * 70}ms` }}
    >
      <span className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
      <span className="min-w-0 flex-1">
        <b className="block text-[15px] leading-5 text-ink-strong">{title}</b>
        <span className="block num text-[13px] leading-[18px] text-ink-muted [overflow-wrap:anywhere]">{detail}</span>
      </span>
      <ArrowUpRight className="w-4 h-4 flex-shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-text" />
    </a>
  );
}

export default function AccessRequestModal({ open, onClose, email }) {
  const [copied, setCopied] = useState(false);
  const typed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? email.trim().toLowerCase() : '';
  const text = message(typed);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* sem área de transferência: o link continua disponível */ }
  };

  return (
    <Modal open={open} onClose={onClose} icon={UserPlus} title="Pedir acesso ao Pluviômetro" subtitle="Fale com o administrador do painel" size="md" initialFocus="#acesso-intro">
      <p id="acesso-intro" tabIndex={-1} className="text-[14px] leading-[21px] text-ink outline-none">
        Envie seu nome e o e-mail que vai usar para entrar. O cadastro é feito pelo administrador e a senha inicial chega a você por ele.
      </p>

      <div className="mt-4 space-y-2.5">
        <Channel
          index={0}
          href={`https://wa.me/${ADMIN.whatsapp}?text=${encodeURIComponent(text)}`}
          icon={MessageCircle}
          tone="bg-[#25D366]/15 text-[#128C4B] dark:text-[#4ade80]"
          title="Chamar no WhatsApp"
          detail={ADMIN.whatsappLabel}
        />
        <Channel
          index={1}
          href={`mailto:${ADMIN.email}?subject=${encodeURIComponent('Acesso ao Pluviômetro · UBS Placas')}&body=${encodeURIComponent(`${text}\n\nNome:\nSetor:`)}`}
          icon={Mail}
          tone="bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
          title="Enviar e-mail"
          detail={<>{ADMIN.email.split('@')[0]}@<wbr />{ADMIN.email.split('@')[1]}</>}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-[12.5px] leading-[18px] text-ink-muted [animation:fade-in_.4s_ease_.25s_both]">
        <span className="min-w-0 [overflow-wrap:anywhere]">{typed ? <>A mensagem já leva o e-mail <b className="text-ink">{typed}</b>.</> : 'Dica: digite seu e-mail no login antes e ele já vai na mensagem.'}</span>
        <button type="button" onClick={copyEmail} className="btn btn-secondary h-9 px-3 text-[13px] flex-shrink-0 self-start sm:self-auto" aria-live="polite">
          {copied ? <><Check /> Copiado</> : <><Copy /> Copiar e-mail</>}
        </button>
      </div>
    </Modal>
  );
}
