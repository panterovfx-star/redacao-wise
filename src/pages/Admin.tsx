import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Users, FileText, CreditCard, Settings, Brain, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEssays: 0,
    todayEssays: 0,
    freeUsers: 0,
    standardUsers: 0,
    proUsers: 0,
    mrr: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [essays, setEssays] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
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

      // Fetch profiles for financial stats
      const { data: allProfilesData } = await supabase
        .from('profiles')
        .select('plan');

      const planCounts = allProfilesData?.reduce((acc: any, profile) => {
        acc[profile.plan] = (acc[profile.plan] || 0) + 1;
        return acc;
      }, { free: 0, standard: 0, pro: 0 }) || { free: 0, standard: 0, pro: 0 };

      // Calculate MRR (Monthly Recurring Revenue)
      const mrr = (planCounts.standard * 29.90) + (planCounts.pro * 59.90);

      setStats({
        totalUsers: usersCount || 0,
        totalEssays: essaysCount || 0,
        todayEssays: todayCount || 0,
        freeUsers: planCounts.free,
        standardUsers: planCounts.standard,
        proUsers: planCounts.pro,
        mrr: mrr,
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
      
      // Fetch disputes
      const { data: disputesData } = await supabase
        .from('essay_disputes')
        .select(`
          *,
          essays:essay_id (
            id,
            title,
            essay_type,
            score,
            content,
            correction_result
          )
        `)
        .order('created_at', { ascending: false });

      // Add profile emails to disputes
      const disputesWithEmails = disputesData?.map(dispute => ({
        ...dispute,
        profiles: allProfiles?.find(p => p.user_id === dispute.user_id)
      })) || [];

      setDisputes(disputesWithEmails);
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

  const handleDisputeAction = async (disputeId: string, action: 'approved' | 'rejected', adminNotes?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const dispute = disputes.find(d => d.id === disputeId);
    if (!dispute) return;

    // Update dispute status
    const { error: disputeError } = await supabase
      .from('essay_disputes')
      .update({
        status: action,
        admin_id: session.user.id,
        admin_notes: adminNotes || null,
      })
      .eq('id', disputeId);

    if (disputeError) {
      toast({
        title: "Erro",
        description: "Não foi possível processar a disputa.",
        variant: "destructive",
      });
      return;
    }

    // If approved, create training feedback
    if (action === 'approved' && dispute.essays) {
      await supabase
        .from('ai_training_feedback')
        .insert({
          essay_id: dispute.essay_id,
          admin_id: session.user.id,
          original_score: dispute.essays.score,
          corrected_score: dispute.essays.score, // Admin can adjust later
          feedback_notes: `Disputa aprovada: ${dispute.reason}`,
        });
    }

    toast({
      title: action === 'approved' ? "Disputa aprovada!" : "Disputa rejeitada",
      description: action === 'approved' 
        ? "Feedback registrado para treino da IA."
        : "A disputa foi rejeitada.",
    });

    // Refresh disputes
    const { data: disputesData } = await supabase
      .from('essay_disputes')
      .select(`
        *,
        essays:essay_id (
          id,
          title,
          essay_type,
          score,
          content,
          correction_result
        )
      `)
      .order('created_at', { ascending: false });

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, email');

    const disputesWithEmails = disputesData?.map(dispute => ({
      ...dispute,
      profiles: allProfiles?.find(p => p.user_id === dispute.user_id)
    })) || [];

    setDisputes(disputesWithEmails);
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="px-2 sm:px-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Voltar</span>
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
          <TabsList className="grid w-full grid-cols-4 max-w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="disputes" className="text-xs sm:text-sm">
              Disputas 
              {disputes.filter(d => d.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {disputes.filter(d => d.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
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

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informações Financeiras
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">MRR (Receita Mensal)</p>
                    <Badge variant="default" className="text-lg font-bold">
                      R$ {stats.mrr.toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receita mensal recorrente baseada nas assinaturas ativas
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">ARR (Receita Anual)</p>
                    <Badge variant="secondary" className="text-lg font-bold">
                      R$ {(stats.mrr * 12).toFixed(2)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Projeção anual baseada no MRR atual
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 mt-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Distribuição de Planos
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Free', value: stats.freeUsers, color: 'hsl(var(--muted))' },
                            { name: 'Standard', value: stats.standardUsers, color: 'hsl(var(--primary))' },
                            { name: 'Pro', value: stats.proUsers, color: 'hsl(var(--secondary))' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Free', value: stats.freeUsers, color: 'hsl(var(--muted))' },
                            { name: 'Standard', value: stats.standardUsers, color: 'hsl(var(--primary))' },
                            { name: 'Pro', value: stats.proUsers, color: 'hsl(var(--secondary))' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Free', usuarios: stats.freeUsers, receita: 0 },
                          { name: 'Standard', usuarios: stats.standardUsers, receita: stats.standardUsers * 29.90 },
                          { name: 'Pro', usuarios: stats.proUsers, receita: stats.proUsers * 59.90 }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="usuarios" fill="hsl(var(--primary))" name="Usuários" />
                        <Bar yAxisId="right" dataKey="receita" fill="hsl(var(--secondary))" name="Receita (R$)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <p className="text-2xl font-bold text-muted-foreground">{stats.freeUsers}</p>
                    <p className="text-xs text-muted-foreground">Free</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.totalUsers > 0 ? ((stats.freeUsers / stats.totalUsers) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{stats.standardUsers}</p>
                    <p className="text-xs text-muted-foreground">Standard</p>
                    <p className="text-xs text-primary mt-1">
                      R$ {(stats.standardUsers * 29.90).toFixed(2)}/mês
                    </p>
                  </div>
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <p className="text-2xl font-bold text-secondary">{stats.proUsers}</p>
                    <p className="text-xs text-muted-foreground">Pro</p>
                    <p className="text-xs text-secondary mt-1">
                      R$ {(stats.proUsers * 59.90).toFixed(2)}/mês
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold mb-3">Métricas de Conversão</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de Conversão (Free → Pago)</span>
                    <span className="font-semibold">
                      {stats.totalUsers > 0 
                        ? (((stats.standardUsers + stats.proUsers) / stats.totalUsers) * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ticket Médio</span>
                    <span className="font-semibold">
                      R$ {(stats.standardUsers + stats.proUsers) > 0 
                        ? (stats.mrr / (stats.standardUsers + stats.proUsers)).toFixed(2) 
                        : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usuários Pagantes</span>
                    <span className="font-semibold">
                      {stats.standardUsers + stats.proUsers} de {stats.totalUsers}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
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
                          <TableCell>
                            {user.last_correction_date === new Date().toISOString().split('T')[0]
                              ? (user.daily_corrections_used || 0)
                              : 0}
                          </TableCell>
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

          <TabsContent value="disputes" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Contestações de Correções
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Revise as contestações dos alunos e decida se devem ser aprovadas para treino da IA.
              </p>
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Redação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputes.map((dispute) => (
                      <TableRow key={dispute.id}>
                        <TableCell className="font-medium">
                          {dispute.profiles?.email || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {dispute.essays?.title || 'Sem título'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {dispute.essays?.essay_type === 'enem' ? 'ENEM' : 'Vestibular'}
                          </Badge>
                        </TableCell>
                        <TableCell>{dispute.essays?.score || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            dispute.status === 'pending' ? 'secondary' :
                            dispute.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {dispute.status === 'pending' ? 'Pendente' :
                             dispute.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(dispute.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Ver Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Contestação</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Informações</h4>
                                  <p className="text-sm"><strong>Aluno:</strong> {dispute.profiles?.email}</p>
                                  <p className="text-sm"><strong>Redação:</strong> {dispute.essays?.title}</p>
                                  <p className="text-sm"><strong>Nota da IA:</strong> {dispute.essays?.score}</p>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Motivo da Contestação</h4>
                                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded">{dispute.reason}</p>
                                </div>

                                <div>
                                  <h4 className="font-semibold mb-2">Texto da Redação</h4>
                                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded max-h-[200px] overflow-y-auto">
                                    {dispute.essays?.content}
                                  </p>
                                </div>

                                {dispute.status === 'pending' && (
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      variant="default"
                                      onClick={() => handleDisputeAction(dispute.id, 'approved')}
                                    >
                                      Aprovar Contestação
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => handleDisputeAction(dispute.id, 'rejected')}
                                    >
                                      Rejeitar
                                    </Button>
                                  </div>
                                )}

                                {dispute.status !== 'pending' && dispute.admin_notes && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Notas do Admin</h4>
                                    <p className="text-sm bg-muted p-3 rounded">{dispute.admin_notes}</p>
                                  </div>
                                )}
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
