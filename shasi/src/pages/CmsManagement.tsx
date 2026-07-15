import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS, ApiResponse } from "@/integrations/api";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUpload } from "@/components/cms";
import { 
  Sparkles, 
  Info, 
  Layout, 
  Percent, 
  Image as ImageIcon, 
  MessageSquare, 
  Phone,
  Save,
  Plus,
  Trash2,
  Loader2,
  Images,
  Pencil
} from "lucide-react";
import type { CmsHero, CmsAbout, CmsCta, CmsContact, CmsPromotion, CmsTestimonial, CmsServiceOverview, CmsGallery } from "@/types/cms";

export default function CmsManagement() {
  const { toast } = useToast();
  const { activeOrg } = useAuth();
  const queryClient = useQueryClient();
  const publicOrgParams = activeOrg ? { org: activeOrg.slug } : undefined;

  // Fetch all CMS data
  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ["cms-hero-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsHero>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("hero"),
        publicOrgParams
      );
      return res.data || null;
    },
  });

  const { data: about } = useQuery({
    queryKey: ["cms-about-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsAbout>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("about"),
        publicOrgParams
      );
      return res.data || null;
    },
  });

  const { data: cta } = useQuery({
    queryKey: ["cms-cta-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsCta>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("cta"),
        publicOrgParams
      );
      return res.data || null;
    },
  });

  const { data: contact } = useQuery({
    queryKey: ["cms-contact-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsContact>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("contact"),
        publicOrgParams
      );
      return res.data || null;
    },
  });

  const { data: promotions } = useQuery({
    queryKey: ["cms-promotions-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsPromotion[]>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("promotions"),
        publicOrgParams
      );
      return res.data || [];
    },
  });

  const { data: testimonials } = useQuery({
    queryKey: ["cms-testimonials-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsTestimonial[]>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("testimonials"),
        publicOrgParams
      );
      return res.data || [];
    },
  });

  const { data: servicesOverview } = useQuery({
    queryKey: ["cms-services-overview-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsServiceOverview[]>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("services-overview"),
        publicOrgParams
      );
      return res.data || [];
    },
  });

  const { data: gallery } = useQuery({
    queryKey: ["cms-gallery-admin", activeOrg?.slug],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<CmsGallery[]>>(
        API_ENDPOINTS.CMS.PAGE_DETAIL("gallery"),
        publicOrgParams
      );
      return res.data || [];
    },
  });

  // Form states
  const [heroForm, setHeroForm] = useState<Partial<CmsHero>>({});
  const [aboutForm, setAboutForm] = useState<Partial<CmsAbout>>({});
  const [ctaForm, setCtaForm] = useState<Partial<CmsCta>>({});
  const [contactForm, setContactForm] = useState<Partial<CmsContact>>({});
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<CmsServiceOverview | null>(null);
  const [newPromotion, setNewPromotion] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    terms_conditions: "",
    banner_image_url: null as string | null,
    is_active: true,
  });
  const [newGalleryItem, setNewGalleryItem] = useState({
    before_image_url: "",
    after_image_url: "",
    caption: "",
    category: "",
    is_active: true,
  });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    short_description: "",
    image_url: null as string | null,
    display_order: 0,
    is_active: true,
  });

  // Update hero when data loads
  useState(() => {
    if (hero) setHeroForm(hero);
  });

  // Mutations
  const updateHero = useMutation({
    mutationFn: async (data: Partial<CmsHero>) => {
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("hero"),
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-hero-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-hero"] });
      toast({ title: "Hero section updated!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateAbout = useMutation({
    mutationFn: async (data: Partial<CmsAbout>) => {
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("about"),
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-about-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-about"] });
      toast({ title: "About section updated!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateCta = useMutation({
    mutationFn: async (data: Partial<CmsCta>) => {
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("cta"),
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-cta-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-cta"] });
      toast({ title: "CTA section updated!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateContact = useMutation({
    mutationFn: async (data: Partial<CmsContact>) => {
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("contact"),
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-contact-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-contact"] });
      toast({ title: "Contact info updated!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const currentPromos = queryClient.getQueryData<CmsPromotion[]>(["cms-promotions-admin"]) || promotions || [];
      const updatedPromos = currentPromos.filter((p) => p.id !== id);
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("promotions"),
        updatedPromos
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-promotions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-promotions"] });
      toast({ title: "Promotion deleted!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const togglePromotion = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const currentPromos = queryClient.getQueryData<CmsPromotion[]>(["cms-promotions-admin"]) || promotions || [];
      const updatedPromos = currentPromos.map((p) => 
        p.id === id ? { ...p, is_active, updated_at: new Date().toISOString() } : p
      );
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("promotions"),
        updatedPromos
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-promotions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-promotions"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createPromotion = useMutation({
    mutationFn: async (data: Omit<CmsPromotion, "id" | "created_at" | "updated_at">) => {
      const currentPromos = queryClient.getQueryData<CmsPromotion[]>(["cms-promotions-admin"]) || promotions || [];
      const newPromo: CmsPromotion = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updatedPromos = [newPromo, ...currentPromos];
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("promotions"),
        updatedPromos
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-promotions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-promotions"] });
      setPromotionDialogOpen(false);
      setNewPromotion({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        terms_conditions: "",
        banner_image_url: null,
        is_active: true,
      });
      toast({ title: "Promotion created!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createGalleryItem = useMutation({
    mutationFn: async (data: Omit<CmsGallery, "id" | "created_at" | "updated_at" | "display_order">) => {
      const currentGallery = queryClient.getQueryData<CmsGallery[]>(["cms-gallery-admin"]) || gallery || [];
      const newItem: CmsGallery = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        display_order: currentGallery.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updatedGallery = [...currentGallery, newItem];
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("gallery"),
        updatedGallery
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-gallery-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-gallery"] });
      setGalleryDialogOpen(false);
      setNewGalleryItem({
        before_image_url: "",
        after_image_url: "",
        caption: "",
        category: "",
        is_active: true,
      });
      toast({ title: "Gallery item added!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteGalleryItem = useMutation({
    mutationFn: async (id: string) => {
      const currentGallery = queryClient.getQueryData<CmsGallery[]>(["cms-gallery-admin"]) || gallery || [];
      const updatedGallery = currentGallery.filter((item) => item.id !== id);
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("gallery"),
        updatedGallery
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-gallery-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-gallery"] });
      toast({ title: "Gallery item deleted!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  // Services Overview mutations
  const createService = useMutation({
    mutationFn: async (data: Omit<CmsServiceOverview, "id" | "created_at" | "updated_at">) => {
      const currentServices = queryClient.getQueryData<CmsServiceOverview[]>(["cms-services-overview-admin"]) || servicesOverview || [];
      const newServiceItem: CmsServiceOverview = {
        ...data,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updatedServices = [...currentServices, newServiceItem];
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("services-overview"),
        updatedServices
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview"] });
      setServiceDialogOpen(false);
      resetServiceForm();
      toast({ title: "Layanan berhasil ditambahkan!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<CmsServiceOverview, "id" | "created_at" | "updated_at"> }) => {
      const currentServices = queryClient.getQueryData<CmsServiceOverview[]>(["cms-services-overview-admin"]) || servicesOverview || [];
      const updatedServices = currentServices.map((s) => 
        s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s
      );
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("services-overview"),
        updatedServices
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview"] });
      setServiceDialogOpen(false);
      setEditingService(null);
      resetServiceForm();
      toast({ title: "Layanan berhasil diupdate!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const currentServices = queryClient.getQueryData<CmsServiceOverview[]>(["cms-services-overview-admin"]) || servicesOverview || [];
      const updatedServices = currentServices.filter((s) => s.id !== id);
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("services-overview"),
        updatedServices
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview"] });
      toast({ title: "Layanan berhasil dihapus!" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const toggleService = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const currentServices = queryClient.getQueryData<CmsServiceOverview[]>(["cms-services-overview-admin"]) || servicesOverview || [];
      const updatedServices = currentServices.map((s) => 
        s.id === id ? { ...s, is_active, updated_at: new Date().toISOString() } : s
      );
      await apiClient.put(
        API_ENDPOINTS.CMS.PAGE_UPDATE("services-overview"),
        updatedServices
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview-admin"] });
      queryClient.invalidateQueries({ queryKey: ["cms-services-overview"] });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const resetServiceForm = () => {
    setServiceForm({
      name: "",
      short_description: "",
      image_url: null,
      display_order: 0,
      is_active: true,
    });
  };

  const openEditService = (service: CmsServiceOverview) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      short_description: service.short_description,
      image_url: service.image_url,
      display_order: service.display_order,
      is_active: service.is_active,
    });
    setServiceDialogOpen(true);
  };

  const openAddService = () => {
    setEditingService(null);
    resetServiceForm();
    setServiceDialogOpen(true);
  };

  if (heroLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Website CMS" description="Manage your landing page content" />

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="hero" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Hero
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="h-4 w-4" />
            About
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Layout className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-2">
            <Percent className="h-4 w-4" />
            Promotions
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-2">
            <Images className="h-4 w-4" />
            Gallery
          </TabsTrigger>
          <TabsTrigger value="testimonials" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Testimonials
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
        </TabsList>

        {/* Hero Section */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Edit the main banner of your landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={heroForm.tagline ?? hero?.tagline ?? ""}
                    onChange={(e) => setHeroForm({ ...heroForm, tagline: e.target.value })}
                    placeholder="Your Beauty, Our Passion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={heroForm.description ?? hero?.description ?? ""}
                    onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })}
                    placeholder="Experience premium aesthetic treatments..."
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Button Text</Label>
                    <Input
                      value={heroForm.cta_primary_text ?? hero?.cta_primary_text ?? ""}
                      onChange={(e) => setHeroForm({ ...heroForm, cta_primary_text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Button Text</Label>
                    <Input
                      value={heroForm.cta_secondary_text ?? hero?.cta_secondary_text ?? ""}
                      onChange={(e) => setHeroForm({ ...heroForm, cta_secondary_text: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp URL</Label>
                  <Input
                    value={heroForm.whatsapp_url ?? hero?.whatsapp_url ?? ""}
                    onChange={(e) => setHeroForm({ ...heroForm, whatsapp_url: e.target.value })}
                    placeholder="https://wa.me/6282123523139"
                  />
                </div>
                <ImageUpload
                  value={heroForm.background_image_url ?? hero?.background_image_url ?? null}
                  onChange={(url) => setHeroForm({ ...heroForm, background_image_url: url })}
                  label="Background Image"
                  folder="hero"
                />
              </div>
              <Button 
                onClick={() => updateHero.mutate(heroForm)}
                disabled={updateHero.isPending}
              >
                {updateHero.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About Section</CardTitle>
              <CardDescription>Edit your clinic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={aboutForm.title ?? about?.title ?? ""}
                    onChange={(e) => setAboutForm({ ...aboutForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Introduction</Label>
                  <Textarea
                    value={aboutForm.introduction ?? about?.introduction ?? ""}
                    onChange={(e) => setAboutForm({ ...aboutForm, introduction: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vision</Label>
                  <Textarea
                    value={aboutForm.vision ?? about?.vision ?? ""}
                    onChange={(e) => setAboutForm({ ...aboutForm, vision: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mission</Label>
                  <Textarea
                    value={aboutForm.mission ?? about?.mission ?? ""}
                    onChange={(e) => setAboutForm({ ...aboutForm, mission: e.target.value })}
                  />
                </div>
                <ImageUpload
                  value={aboutForm.image_url ?? about?.image_url ?? null}
                  onChange={(url) => setAboutForm({ ...aboutForm, image_url: url })}
                  label="Clinic Photo"
                  folder="about"
                />
              </div>
              <Button 
                onClick={() => updateAbout.mutate(aboutForm)}
                disabled={updateAbout.isPending}
              >
                {updateAbout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Overview */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Layanan Overview</CardTitle>
                <CardDescription>Kelola layanan yang ditampilkan di landing page</CardDescription>
              </div>
              <Dialog open={serviceDialogOpen} onOpenChange={(open) => {
                setServiceDialogOpen(open);
                if (!open) {
                  setEditingService(null);
                  resetServiceForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openAddService}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Layanan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingService ? "Edit Layanan" : "Tambah Layanan Baru"}</DialogTitle>
                    <DialogDescription>
                      {editingService ? "Ubah informasi layanan" : "Tambah layanan baru untuk ditampilkan di landing page"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <ImageUpload
                      value={serviceForm.image_url}
                      onChange={(url) => setServiceForm({ ...serviceForm, image_url: url })}
                      label="Gambar Layanan"
                      folder="services"
                    />
                    <div className="space-y-2">
                      <Label>Nama Layanan *</Label>
                      <Input
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        placeholder="contoh: Perawatan Wajah"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deskripsi Singkat *</Label>
                      <Textarea
                        value={serviceForm.short_description}
                        onChange={(e) => setServiceForm({ ...serviceForm, short_description: e.target.value })}
                        placeholder="Jelaskan layanan ini secara singkat..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Urutan Tampil</Label>
                      <Input
                        type="number"
                        value={serviceForm.display_order}
                        onChange={(e) => setServiceForm({ ...serviceForm, display_order: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Aktif</Label>
                      <Switch
                        checked={serviceForm.is_active}
                        onCheckedChange={(checked) => setServiceForm({ ...serviceForm, is_active: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Batal</Button>
                    <Button 
                      onClick={() => {
                        if (editingService) {
                          updateService.mutate({ id: editingService.id, data: serviceForm });
                        } else {
                          createService.mutate(serviceForm);
                        }
                      }}
                      disabled={createService.isPending || updateService.isPending || !serviceForm.name || !serviceForm.short_description}
                    >
                      {(createService.isPending || updateService.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editingService ? "Simpan Perubahan" : "Tambah Layanan"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {servicesOverview && servicesOverview.length > 0 ? (
                <div className="space-y-4">
                  {servicesOverview.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={service.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Layout className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-medium truncate">{service.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">{service.short_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Urutan: {service.display_order}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch 
                          checked={service.is_active}
                          onCheckedChange={(checked) => toggleService.mutate({ id: service.id, is_active: checked })}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditService(service)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteService.mutate(service.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada layanan ditambahkan. Layanan default akan ditampilkan di landing page.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotions */}
        <TabsContent value="promotions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly Promotions</CardTitle>
                <CardDescription>Manage your promotional offers</CardDescription>
              </div>
              <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Promotion
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Add New Promotion</DialogTitle>
                    <DialogDescription>Create a new monthly promotion for your landing page</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="grid gap-4 py-4 pr-4">
                      <ImageUpload
                        value={newPromotion.banner_image_url}
                        onChange={(url) => setNewPromotion({ ...newPromotion, banner_image_url: url })}
                        label="Promotion Banner Image"
                        folder="promotions"
                      />
                      <div className="space-y-2">
                        <Label>Promotion Title *</Label>
                        <Input
                          value={newPromotion.title}
                          onChange={(e) => setNewPromotion({ ...newPromotion, title: e.target.value })}
                          placeholder="e.g. February Special - 50% Off Facial"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newPromotion.description}
                          onChange={(e) => setNewPromotion({ ...newPromotion, description: e.target.value })}
                          placeholder="Describe your promotional offer..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date *</Label>
                          <Input
                            type="date"
                            value={newPromotion.start_date}
                            onChange={(e) => setNewPromotion({ ...newPromotion, start_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date *</Label>
                          <Input
                            type="date"
                            value={newPromotion.end_date}
                            onChange={(e) => setNewPromotion({ ...newPromotion, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Terms & Conditions</Label>
                        <Input
                          value={newPromotion.terms_conditions}
                          onChange={(e) => setNewPromotion({ ...newPromotion, terms_conditions: e.target.value })}
                          placeholder="e.g. Valid for new customers only"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Active</Label>
                        <Switch
                          checked={newPromotion.is_active}
                          onCheckedChange={(checked) => setNewPromotion({ ...newPromotion, is_active: checked })}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPromotionDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createPromotion.mutate(newPromotion)}
                      disabled={createPromotion.isPending || !newPromotion.title || !newPromotion.start_date || !newPromotion.end_date}
                    >
                      {createPromotion.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Create Promotion
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {promotions && promotions.length > 0 ? (
                <div className="space-y-4">
                  {promotions.map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{promo.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {promo.start_date} - {promo.end_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={promo.is_active} 
                          onCheckedChange={(checked) => togglePromotion.mutate({ id: promo.id, is_active: checked })}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deletePromotion.mutate(promo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No promotions yet. Add your first monthly promotion!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gallery */}
        <TabsContent value="gallery">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Before & After Gallery</CardTitle>
                <CardDescription>Manage your transformation gallery images</CardDescription>
              </div>
              <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Gallery Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Add Before & After</DialogTitle>
                    <DialogDescription>Upload transformation images for your gallery</DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="grid gap-4 py-4 pr-4">
                      <div className="grid grid-cols-2 gap-4">
                        <ImageUpload
                          value={newGalleryItem.before_image_url || null}
                          onChange={(url) => setNewGalleryItem({ ...newGalleryItem, before_image_url: url || "" })}
                          label="Before Image *"
                          folder="gallery/before"
                        />
                        <ImageUpload
                          value={newGalleryItem.after_image_url || null}
                          onChange={(url) => setNewGalleryItem({ ...newGalleryItem, after_image_url: url || "" })}
                          label="After Image *"
                          folder="gallery/after"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Caption</Label>
                        <Input
                          value={newGalleryItem.caption}
                          onChange={(e) => setNewGalleryItem({ ...newGalleryItem, caption: e.target.value })}
                          placeholder="e.g. Acne Treatment - 3 months progress"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input
                          value={newGalleryItem.category}
                          onChange={(e) => setNewGalleryItem({ ...newGalleryItem, category: e.target.value })}
                          placeholder="e.g. Acne, Anti-Aging, Skin Brightening"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Active</Label>
                        <Switch
                          checked={newGalleryItem.is_active}
                          onCheckedChange={(checked) => setNewGalleryItem({ ...newGalleryItem, is_active: checked })}
                        />
                      </div>
                    </div>
                  </ScrollArea>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGalleryDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createGalleryItem.mutate(newGalleryItem)}
                      disabled={createGalleryItem.isPending || !newGalleryItem.before_image_url || !newGalleryItem.after_image_url}
                    >
                      {createGalleryItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Add to Gallery
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {gallery && gallery.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gallery.map((item) => (
                    <div key={item.id} className="border rounded-lg overflow-hidden group relative">
                      <div className="grid grid-cols-2 h-32">
                        <img 
                          src={item.before_image_url} 
                          alt="Before" 
                          className="w-full h-full object-cover border-r"
                        />
                        <img 
                          src={item.after_image_url} 
                          alt="After" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium">{item.caption || "Untitled"}</p>
                        {item.category && (
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteGalleryItem.mutate(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No gallery items yet. Add your first before & after images!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Testimonials</CardTitle>
                <CardDescription>Manage client testimonials</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
            </CardHeader>
            <CardContent>
              {testimonials && testimonials.length > 0 ? (
                <div className="space-y-4">
                  {testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="p-4 border rounded-lg">
                      <p className="italic mb-2">"{testimonial.testimonial_text}"</p>
                      <p className="text-sm font-medium">- {testimonial.patient_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No testimonials yet. Default testimonials will be shown.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Edit your contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea
                    value={contactForm.address ?? contact?.address ?? ""}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>WhatsApp Number</Label>
                    <Input
                      value={contactForm.whatsapp_number ?? contact?.whatsapp_number ?? ""}
                      onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })}
                      placeholder="6282123523139"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={contactForm.email ?? contact?.email ?? ""}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input
                      value={contactForm.instagram_url ?? contact?.instagram_url ?? ""}
                      onChange={(e) => setContactForm({ ...contactForm, instagram_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input
                      value={contactForm.facebook_url ?? contact?.facebook_url ?? ""}
                      onChange={(e) => setContactForm({ ...contactForm, facebook_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok URL</Label>
                    <Input
                      value={contactForm.tiktok_url ?? contact?.tiktok_url ?? ""}
                      onChange={(e) => setContactForm({ ...contactForm, tiktok_url: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Google Maps Embed URL</Label>
                  <Input
                    value={contactForm.google_maps_embed ?? contact?.google_maps_embed ?? ""}
                    onChange={(e) => setContactForm({ ...contactForm, google_maps_embed: e.target.value })}
                    placeholder="https://www.google.com/maps/embed?..."
                  />
                </div>
              </div>
              <Button 
                onClick={() => updateContact.mutate(contactForm)}
                disabled={updateContact.isPending}
              >
                {updateContact.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
