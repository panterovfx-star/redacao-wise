import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Terms = () => {
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

      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-neutral dark:prose-invert">
        <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 21 de maio de 2026</p>

        <section className="space-y-6 text-foreground/90 leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-2">1. Aceitação dos Termos</h2>
            <p>Ao criar uma conta e utilizar o Redator ("Serviço"), você concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize a plataforma.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">2. Descrição do Serviço</h2>
            <p>O Redator é uma plataforma de correção automatizada de redações (ENEM, vestibulares e concursos) com auxílio de inteligência artificial. As correções são geradas por modelos de IA e têm caráter informativo e educacional, podendo conter imprecisões.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">3. Cadastro</h2>
            <p>Você deve fornecer informações verdadeiras e atualizadas. É responsável pela confidencialidade da sua senha e por todas as atividades realizadas em sua conta. Menores de 18 anos devem ter autorização dos pais ou responsáveis.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">4. Planos e Pagamentos</h2>
            <p>Oferecemos plano gratuito e planos pagos (Standard e Pro), mensais ou anuais. Os pagamentos são processados via Stripe. A assinatura é renovada automaticamente até o cancelamento. O cancelamento pode ser feito a qualquer momento pelo portal do cliente, mantendo o acesso até o fim do período já pago.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">5. Reembolso</h2>
            <p>Conforme o Código de Defesa do Consumidor (Art. 49), você pode solicitar reembolso integral em até 7 dias após a contratação, desde que não tenha utilizado as correções pagas. Após esse prazo ou com uso, os valores não são reembolsáveis.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">6. Uso Aceitável</h2>
            <p>É proibido: (i) enviar conteúdo ilegal, ofensivo ou que viole direitos de terceiros; (ii) tentar burlar limites de uso; (iii) fazer engenharia reversa do Serviço; (iv) revender ou redistribuir as correções comercialmente sem autorização.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">7. Propriedade Intelectual</h2>
            <p>As redações enviadas permanecem de propriedade do usuário. O Redator detém todos os direitos sobre o software, marca, design e tecnologia da plataforma. Você nos concede licença para processar suas redações para fins de correção e melhoria do serviço (de forma anonimizada).</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">8. Limitação de Responsabilidade</h2>
            <p>As correções da IA são auxílio educacional e não substituem corretores oficiais. Não garantimos resultados específicos em provas. O Serviço é fornecido "como está" e não nos responsabilizamos por danos indiretos decorrentes do uso.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">9. Suspensão e Encerramento</h2>
            <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, sem reembolso de valores pagos.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">10. Alterações</h2>
            <p>Estes Termos podem ser atualizados a qualquer momento. Mudanças relevantes serão comunicadas por email ou na plataforma.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">11. Foro</h2>
            <p>Fica eleito o foro da comarca do domicílio do usuário no Brasil para dirimir quaisquer controvérsias.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-2">12. Contato</h2>
            <p>Dúvidas sobre estes Termos podem ser enviadas para o email de suporte cadastrado na plataforma.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Terms;
