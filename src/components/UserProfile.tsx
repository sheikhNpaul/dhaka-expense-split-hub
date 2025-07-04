import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { User, Edit3, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserProfileProps {
  profile: any;
  onProfileUpdate: () => void;
}

// Add a static list of all ISO 4217 currencies
const ALL_CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ' },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ' },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼' },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM' },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: 'Bds$' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
  { code: 'BMD', name: 'Bermudian Dollar', symbol: 'BD$' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$' },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$' },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu.' },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡' },
  { code: 'CUC', name: 'Cuban Convertible Peso', symbol: '$' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$' },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fdj' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'دج' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'FJD', name: 'Fijian Dollar', symbol: 'FJ$' },
  { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'GIP', name: 'Gibraltar Pound', symbol: '£' },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'FG' },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q' },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: 'GY$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn' },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪' },
  { code: 'IMP', name: 'Isle of Man Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr' },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'лв' },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛' },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'CF' },
  { code: 'KPW', name: 'North Korean Won', symbol: '₩' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'KYD', name: 'Cayman Islands Dollar', symbol: 'CI$' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨' },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$' },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar' },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден' },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K' },
  { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$' },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM' },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨' },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf' },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
  { code: 'NAD', name: 'Namibian Dollar', symbol: 'N$' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.' },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.' },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł' },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: '₲' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин.' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'FRw' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$' },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'SHP', name: 'Saint Helena Pound', symbol: '£' },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh' },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: '£' },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', symbol: 'Db' },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£' },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'E' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'ЅM' },
  { code: 'TMT', name: 'Turkmenistan Manat', symbol: 'm' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت' },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'Sh' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'UZS', name: 'Uzbekistani Soʻm', symbol: 'soʻm' },
  { code: 'VES', name: 'Venezuelan Bolívar Soberano', symbol: 'Bs.S' },
  { code: 'VND', name: 'Vietnamese Đồng', symbol: '₫' },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'VT' },
  { code: 'WST', name: 'Samoan Tala', symbol: 'T' },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$' },
  { code: 'XOF', name: 'West African CFA franc', symbol: 'CFA' },
  { code: 'XPF', name: 'CFP Franc', symbol: '₣' },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK' },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: 'Z$' },
];

export const UserProfile = ({ profile, onProfileUpdate }: UserProfileProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    currency: profile?.currency || 'BDT',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  // Check if mobile on mount and resize
  useState(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          currency: formData.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      onProfileUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      email: profile?.email || '',
      currency: profile?.currency || 'BDT',
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCurrencies = useMemo(() => {
    return ALL_CURRENCIES
      .filter(c =>
        c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(currencySearch.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currencySearch]);

  const ProfileContent = () => (
    <div className={`flex flex-col ${isMobile ? 'gap-5 p-4' : 'gap-6 p-6'}`}>
      {/* Avatar Section */}
      <div className={`flex flex-col items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
        <div className={`relative ${isMobile ? 'h-24 w-24' : 'h-20 w-20'}`}>
          <Avatar className={`${isMobile ? 'h-24 w-24' : 'h-20 w-20'}`}>
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback className={`${isMobile ? 'text-2xl' : 'text-lg'} bg-primary text-primary-foreground`}>
              {profile?.name ? getInitials(profile.name) : <User className={`${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`} />}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center">
          <h3 className={`font-semibold ${isMobile ? 'text-xl' : 'text-lg'}`}>
            {profile?.name || 'User'}
          </h3>
          <p className={`text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}>
            {profile?.email || 'user@example.com'}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className={`flex flex-col ${isMobile ? 'gap-4' : 'gap-5'}`}>
        <div className="space-y-2">
          <Label htmlFor="name" className={`${isMobile ? 'text-base' : 'text-sm'}`}>
            Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            disabled={!isEditing || isLoading}
            className={`${isMobile ? 'h-12 text-base' : 'h-10 text-sm'}`}
            placeholder="Enter your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={`${isMobile ? 'text-base' : 'text-sm'}`}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            disabled={!isEditing || isLoading}
            className={`${isMobile ? 'h-12 text-base' : 'h-10 text-sm'}`}
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency" className={`${isMobile ? 'text-base' : 'text-sm'}`}>Preferred Currency</Label>
          <Input
            id="currency-search"
            placeholder="Search currency..."
            value={currencySearch}
            onChange={e => setCurrencySearch(e.target.value)}
            className={`mb-2 ${isMobile ? 'h-10 text-base' : 'h-9 text-sm'}`}
            disabled={!isEditing || isLoading}
            onFocus={() => setCurrencyDropdownOpen(true)}
          />
          <div className="relative">
            {currencyDropdownOpen && isEditing && !isLoading && (
              <div
                className="absolute z-20 w-full max-h-56 overflow-y-auto bg-background border border-border rounded shadow-lg mt-1"
                onMouseLeave={() => setCurrencyDropdownOpen(false)}
              >
                {filteredCurrencies.length === 0 ? (
                  <div className="px-4 py-2 text-muted-foreground text-sm">No currencies found</div>
                ) : (
                  filteredCurrencies.map(c => (
                    <div
                      key={c.code}
                      className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-primary/10 transition-colors ${formData.currency === c.code ? 'bg-primary/10 font-semibold' : ''}`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, currency: c.code }));
                        setCurrencyDropdownOpen(false);
                      }}
                    >
                      <span>{c.name} <span className="text-xs text-muted-foreground">({c.code})</span></span>
                      <span className="ml-2">{c.symbol}</span>
                    </div>
                  ))
                )}
              </div>
            )}
            <div
              className={`w-full border rounded px-3 py-2 bg-background flex items-center justify-between cursor-pointer ${isMobile ? 'h-12 text-base' : 'h-10 text-sm'} ${!isEditing || isLoading ? 'opacity-60 pointer-events-none' : ''}`}
              onClick={() => { if (isEditing && !isLoading) setCurrencyDropdownOpen(v => !v); }}
              tabIndex={0}
              onBlur={() => setCurrencyDropdownOpen(false)}
            >
              {(() => {
                const selected = ALL_CURRENCIES.find(c => c.code === formData.currency);
                return selected ? (
                  <>
                    <span>{selected.name} <span className="text-xs text-muted-foreground">({selected.code})</span></span>
                    <span className="ml-2">{selected.symbol}</span>
                  </>
                ) : <span className="text-muted-foreground">Select currency</span>;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className={`flex-1 ${
              isMobile ? 'h-12 text-base' : 'h-10 text-sm'
            }`}
          >
            <Edit3 className={`mr-2 ${
              isMobile ? 'h-5 w-5' : 'h-4 w-4'
            }`} />
            Edit Profile
          </Button>
        ) : (
          <>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex-1 ${
                isMobile ? 'h-12 text-base' : 'h-10 text-sm'
              }`}
            >
              <Save className={`mr-2 ${
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              }`} />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className={`flex-1 ${
                isMobile ? 'h-12 text-base' : 'h-10 text-sm'
              }`}
            >
              <X className={`mr-2 ${
                isMobile ? 'h-5 w-5' : 'h-4 w-4'
              }`} />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={`relative p-0 ${
            isMobile ? 'h-12 w-12' : 'h-9 w-9'
          }`}
        >
          <Avatar className={`${
            isMobile ? 'h-12 w-12' : 'h-9 w-9'
          }`}>
            <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
            <AvatarFallback className={`${
              isMobile ? 'text-sm' : 'text-xs'
            } bg-primary text-primary-foreground`}>
              {profile?.name ? getInitials(profile.name) : <User className={`${
                isMobile ? 'h-4 w-4' : 'h-3 w-3'
              }`} />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DialogTrigger>
      <DialogContent className={`${
        isMobile ? 'w-full max-w-md mx-4' : 'w-full max-w-md'
      }`}>
        <DialogHeader>
          <DialogTitle className={`${
            isMobile ? 'text-xl' : 'text-lg'
          }`}>
            Profile Settings
          </DialogTitle>
        </DialogHeader>
        <ProfileContent />
      </DialogContent>
    </Dialog>
  );
};
