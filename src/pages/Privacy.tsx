import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Redator</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de maio de 2026</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-2">1. Quem Somos</h2>
            <p>O Redator é uma plataforma de correção de redações com inteligência artificial. Esta política descreve como tratamos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">2. Dados Coletados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cadastro:</strong> email e senha (criptografada).</li>
              <li><strong>Conteúdo:</strong> redações que você envia para correção.</li>
              <li><strong>Pagamento:</strong> processado pelo Stripe — não armazenamos dados de cartão.</li>
              <li><strong>Uso:</strong> número de correções, plano contratado, datas de acesso.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">3. Finalidade do Tratamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer e melhorar o serviço de correção.</li>
              <li>Processar pagamentos e gerenciar assinaturas.</li>
              <li>Treinar e calibrar o modelo de IA de forma anonimizada.</li>
              <li>Comunicar mudanças, suporte e atualizações relevantes.</li>
              <li>Cumprir obrigações legais e fiscais.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">4. Base Legal</h2>
            <p>Tratamos seus dados com base no consentimento (cadastro), execução de contrato (assinaturas), cumprimento de obrigação legal (fiscal) e legítimo interesse (melhoria do serviço).</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">5. Compartilhamento</h2>
            <p>Não vendemos seus dados. Compartilhamos apenas com prestadores essenciais ao funcionamento da plataforma:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Supabase / Lovable Cloud:</strong> hospedagem e banco de dados.</li>
              <li><strong>Stripe:</strong> processamento de pagamentos.</li>
              <li><strong>Provedores de IA (Google, OpenAI):</strong> processamento das redações para gerar a correção.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">6. Armazenamento e Segurança</h2>
            <p>Adotamos medidas técnicas e administrativas para proteger seus dados, incluindo criptografia em trânsito (HTTPS), controle de acesso por permissões (RLS) e armazenamento em servidores seguros. Mesmo assim, nenhum sistema é 100% imune a incidentes.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">7. Seus Direitos (LGPD)</h2>
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acesso aos seus dados.</li>
              <li>Correção de dados incompletos ou desatualizados.</li>
              <li>Exclusão dos seus dados e da conta.</li>
              <li>Portabilidade dos dados.</li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p className="mt-2">Entre em contato pelo email de suporte para exercer esses direitos.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">8. Retenção</h2>
            <p>Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, os dados podem ser mantidos por até 5 anos para cumprimento de obrigações legais e fiscais, e depois excluídos.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">9. Cookies</h2>
            <p>Usamos cookies essenciais para manter sua sessão autenticada e preferências de tema. Não usamos cookies de publicidade de terceiros.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">10. Menores de Idade</h2>
            <p>Usuários menores de 18 anos devem utilizar o serviço com autorização e supervisão dos pais ou responsáveis legais.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">11. Alterações</h2>
            <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">12. Contato do Encarregado</h2>
            <p>Para questões sobre privacidade e proteção de dados, entre em contato pelo email de suporte cadastrado na plataforma.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
