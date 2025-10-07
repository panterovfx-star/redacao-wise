import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Users, FileText, CreditCard, Brain, Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEssays: 0,
    todayEssays: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [essays, setEssays] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editRole, setEditRole] = useState("");
  const [selectedEssay, setSelectedEssay] = useState<any>(null);
  const [feedbackScore, setFeedbackScore] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);
      
      const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
      
      if (!userIsAdmin) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Load stats
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: essaysCount } = await supabase
        .from('essays')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('essays')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setStats({
        totalUsers: usersCount || 0,
        totalEssays: essaysCount || 0,
        todayEssays: todayCount || 0,
      });

      // Load all users with their roles
      const { data: allUsers } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role)
        `);
      
      setUsers(allUsers || []);

      // Load all essays for training
      const { data: allEssays } = await supabase
        .from('essays')
        .select('*, profiles(email)')
        .eq('status', 'corrected')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setEssays(allEssays || []);

      setLoading(false);
    };

    checkAdmin();
  }, [navigate, toast]);

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar plano.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso.",
      });
      setUsers(users.map(u => u.user_id === userId ? { ...u, plan: newPlan } : u));
      setEditingUser(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Remove old role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Add new role
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole as 'admin' | 'user' });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Permissão atualizada com sucesso.",
      });
      
      // Update local state
      const updatedUsers = users.map(u => {
        if (u.user_id === userId) {
          return { ...u, user_roles: [{ role: newRole }] };
        }
        return u;
      });
      setUsers(updatedUsers);
      setEditingUser(null);
    }
  };

  const handleSubmitTraining = async () => {
    if (!selectedEssay || !feedbackScore) return;

    const { error } = await supabase
      .from('ai_training_feedback')
      .insert({
        essay_id: selectedEssay.id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        original_score: selectedEssay.score,
        corrected_score: parseInt(feedbackScore),
        feedback_notes: feedbackNotes,
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar feedback de treinamento.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Feedback de treinamento registrado. A IA aprenderá com este exemplo.",
      });
      setSelectedEssay(null);
      setFeedbackScore("");
      setFeedbackNotes("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Painel Administrativo</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground">
            Gerenciamento completo do sistema
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Redações</p>
                <p className="text-2xl font-bold">{stats.totalEssays}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Redações Hoje</p>
                <p className="text-2xl font-bold">{stats.todayEssays}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Gerenciar Usuários
            </TabsTrigger>
            <TabsTrigger value="training">
              <Brain className="w-4 h-4 mr-2" />
              Treinar IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Todos os Usuários</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Correções Usadas</TableHead>
                      <TableHead>Última Correção</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>
                          {editingUser === user.user_id ? (
                            <Select value={editPlan} onValueChange={setEditPlan}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="capitalize">{user.plan}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingUser === user.user_id ? (
                            <Select value={editRole} onValueChange={setEditRole}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="capitalize">
                              {user.user_roles?.[0]?.role || 'user'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{user.daily_corrections_used || 0}</TableCell>
                        <TableCell>
                          {user.last_correction_date 
                            ? new Date(user.last_correction_date).toLocaleDateString('pt-BR')
                            : 'Nunca'}
                        </TableCell>
                        <TableCell>
                          {editingUser === user.user_id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleUpdatePlan(user.user_id, editPlan);
                                  handleUpdateRole(user.user_id, editRole);
                                }}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(user.user_id);
                                setEditPlan(user.plan);
                                setEditRole(user.user_roles?.[0]?.role || 'user');
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="training">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Treinamento da IA</h2>
              <p className="text-muted-foreground mb-6">
                Revise correções e forneça feedback para melhorar a precisão da IA nas avaliações futuras.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Redações Recentes</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {essays.map((essay) => (
                      <Dialog key={essay.id}>
                        <DialogTrigger asChild>
                          <Card 
                            className="p-4 cursor-pointer hover:bg-accent/5 transition-colors"
                            onClick={() => setSelectedEssay(essay)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{essay.title || 'Sem título'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {essay.profiles?.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(essay.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">{essay.score}</p>
                                <p className="text-xs text-muted-foreground">
                                  {essay.essay_type === 'enem' ? '/1000' : '/100'}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Revisar e Treinar IA</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Redação:</h4>
                              <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                                <p className="whitespace-pre-wrap text-sm">{essay.content}</p>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold mb-2">Nota Original da IA:</h4>
                              <p className="text-2xl font-bold">{essay.score}</p>
                            </div>

                            <div>
                              <label className="block font-semibold mb-2">
                                Nota Correta:
                              </label>
                              <Input
                                type="number"
                                placeholder="Digite a nota correta"
                                value={feedbackScore}
                                onChange={(e) => setFeedbackScore(e.target.value)}
                                max={essay.essay_type === 'enem' ? 1000 : 100}
                                min={0}
                              />
                            </div>

                            <div>
                              <label className="block font-semibold mb-2">
                                Observações de Treinamento:
                              </label>
                              <Textarea
                                placeholder="Explique o que a IA errou e como deveria avaliar..."
                                value={feedbackNotes}
                                onChange={(e) => setFeedbackNotes(e.target.value)}
                                rows={4}
                              />
                            </div>

                            <Button 
                              className="w-full" 
                              onClick={handleSubmitTraining}
                              disabled={!feedbackScore}
                            >
                              <Brain className="w-4 h-4 mr-2" />
                              Salvar Feedback de Treinamento
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Como Funciona o Treinamento</h3>
                  <Card className="p-4 bg-muted/50">
                    <ul className="space-y-3 text-sm">
                      <li className="flex gap-2">
                        <span className="text-primary">1.</span>
                        <span>Selecione uma redação corrigida pela IA</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">2.</span>
                        <span>Revise a nota dada pela IA</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">3.</span>
                        <span>Insira a nota correta que deveria ter sido dada</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">4.</span>
                        <span>Adicione observações sobre os critérios de avaliação</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-primary">5.</span>
                        <span>O sistema registra este feedback para melhorar futuras correções</span>
                      </li>
                    </ul>
                  </Card>

                  <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Dicas para Melhor Treinamento
                    </h4>
                    <ul className="text-sm space-y-2 text-muted-foreground">
                      <li>• Seja específico nas observações</li>
                      <li>• Foque nos critérios que a IA errou</li>
                      <li>• Compare com a matriz de avaliação oficial</li>
                      <li>• Registre padrões de erros frequentes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
