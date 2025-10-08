import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Users, FileText, CreditCard, Settings, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('*');

      // Combine profiles with roles
      const usersWithRoles = profilesData?.map(profile => ({
        ...profile,
        user_roles: rolesData?.filter(role => role.user_id === profile.user_id) || []
      })) || [];

      setUsers(usersWithRoles);

      // Fetch essays
      const { data: essaysData } = await supabase
        .from('essays')
        .select('*')
        .eq('status', 'corrected')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch all profiles to match emails
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, email');

      // Combine essays with profile emails
      const essaysWithEmails = essaysData?.map(essay => ({
        ...essay,
        profiles: allProfiles?.find(p => p.user_id === essay.user_id)
      })) || [];

      setEssays(essaysWithEmails);
      setLoading(false);
    };

    checkAdmin();
  }, [navigate, toast]);

  const updateUserPlan = async (userId: string, newPlan: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        plan: newPlan,
        manual_plan_override: true 
      })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Plano atualizado manualmente pelo admin!",
    });

    // Refresh profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Refresh user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*');

    // Combine profiles with roles
    const usersWithRoles = profilesData?.map(profile => ({
      ...profile,
      user_roles: rolesData?.filter(role => role.user_id === profile.user_id) || []
    })) || [];

    setUsers(usersWithRoles);
  };

  const toggleUserRole = async (userId: string, role: 'admin' | 'user', add: boolean) => {
    if (add) {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível adicionar a permissão.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível remover a permissão.",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Sucesso",
      description: add ? "Permissão adicionada!" : "Permissão removida!",
    });

    // Refresh profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // Refresh user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*');

    // Combine profiles with roles
    const usersWithRoles = profilesData?.map(profile => ({
      ...profile,
      user_roles: rolesData?.filter(role => role.user_id === profile.user_id) || []
    })) || [];

    setUsers(usersWithRoles);
  };

  const submitTrainingFeedback = async () => {
    if (!selectedEssay || !feedbackScore) {
      toast({
        title: "Erro",
        description: "Preencha a nota corrigida.",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('ai_training_feedback')
      .insert({
        essay_id: selectedEssay.id,
        admin_id: session.user.id,
        original_score: selectedEssay.score,
        corrected_score: parseInt(feedbackScore),
        feedback_notes: feedbackNotes,
      });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o feedback.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Feedback registrado!",
      description: "Este feedback será usado para melhorar a IA.",
    });

    setSelectedEssay(null);
    setFeedbackScore("");
    setFeedbackNotes("");
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

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gerenciamento completo do sistema
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="training" className="text-xs sm:text-sm">Treinar IA</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
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
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Gerenciamento de Usuários
              </h2>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Correções Usadas</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isAdmin = user.user_roles?.some((r: any) => r.role === 'admin');
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.plan}
                              onValueChange={(value) => updateUserPlan(user.user_id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{user.daily_corrections_used || 0}</TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Badge variant="default">Admin</Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={isAdmin ? "destructive" : "default"}
                              onClick={() => toggleUserRole(user.user_id, 'admin', !isAdmin)}
                            >
                              {isAdmin ? "Remover Admin" : "Tornar Admin"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Treinamento da IA
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Revise as correções da IA e forneça feedback para melhorar a precisão das avaliações.
              </p>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tema</TableHead>
                      <TableHead>Nota IA</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {essays.map((essay) => (
                      <TableRow key={essay.id}>
                        <TableCell>{essay.profiles?.email}</TableCell>
                        <TableCell className="uppercase">{essay.essay_type}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{essay.theme || essay.title || "Sem tema"}</TableCell>
                        <TableCell>
                          <Badge variant={essay.score >= 700 ? "default" : "secondary"}>
                            {essay.score}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(essay.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedEssay(essay)}
                              >
                                Revisar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Revisão de Correção</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-semibold mb-2">Redação:</h3>
                                  <div className="bg-muted p-4 rounded-lg max-h-60 overflow-y-auto">
                                    <p className="whitespace-pre-wrap text-sm">{selectedEssay?.content}</p>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-semibold mb-2">Correção da IA:</h3>
                                  <p className="text-sm">
                                    <strong>Nota:</strong> {selectedEssay?.score}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Nota Corrigida *</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="1000"
                                    value={feedbackScore}
                                    onChange={(e) => setFeedbackScore(e.target.value)}
                                    placeholder="Digite a nota correta"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Observações</label>
                                  <Textarea
                                    value={feedbackNotes}
                                    onChange={(e) => setFeedbackNotes(e.target.value)}
                                    placeholder="Explique o que a IA errou e como deveria avaliar..."
                                    rows={4}
                                  />
                                </div>
                                <Button onClick={submitTrainingFeedback} className="w-full">
                                  Salvar Feedback de Treinamento
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
