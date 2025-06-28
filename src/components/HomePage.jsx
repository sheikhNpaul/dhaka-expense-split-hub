import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    ThemeProvider,
    createTheme,
    styled,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import {
    TrackChanges,
    Assessment,
    Groups,
    TipsAndUpdates,
    Security,
    CloudSync
} from '@mui/icons-material';
import Logo from '../common/Logo';
import Navbar from '../common/Navbar';
import Footer from '../common/Footer';
import AnimatedBackground from '../common/AnimatedBackground';

// Create theme and export it separately
export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6C63FF'
        },
        background: {
            default: '#0A1929',
            paper: '#132F4C'
        }
    },
    typography: {
        fontFamily: '"Inter", sans-serif',
        h1: {
            fontSize: '3.5rem',
            fontWeight: 700,
            lineHeight: 1.2
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '1rem',
                    textTransform: 'none'
                }
            }
        }
    }
});

const GlowingBackground = styled(Box)(() => ({
    position: 'absolute',
    width: '100%',
    height: '100%',
    background: `radial-gradient(circle at 50% 50%, 
        #6C63FF20 0%, 
        #0A192980 50%, 
        #0A1929 100%)`,
    zIndex: 0
}));

const FeatureCard = styled(Card)(() => ({
    background: 'rgba(108, 99, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(108, 99, 255, 0.2)',
    transition: 'all 0.3s ease-in-out',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(108, 99, 255, 0.5)',
    }
}));

const features = [
    {
        icon: <TrackChanges />,
        title: "Track Your Expenses",
        description: "Monitor your daily spending with ease and precision"
    },
    {
        icon: <Assessment />,
        title: "Get an Overview",
        description: "Visualize your spending patterns with interactive charts"
    },
    {
        icon: <Groups />,
        title: "Split Expenses",
        description: "Easily split bills with friends and family"
    },
    {
        icon: <TipsAndUpdates />,
        title: "Get Suggestions",
        description: "Receive AI-powered insights to improve your spending habits"
    },
    {
        icon: <Security />,
        title: "Secure & Private",
        description: "Your financial data is protected with enterprise-grade security"
    },
    {
        icon: <CloudSync />,
        title: "Real-time Sync",
        description: "Access your expenses across all devices instantly"
    }
];

const HomePage = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { x: -50, opacity: 0 },
        visible: { 
            x: 0, 
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    const cardVariants = {
        hidden: { y: 50, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ 
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <AnimatedBackground />
                <Navbar />
                
                <Container 
                    maxWidth="lg" 
                    sx={{ 
                        position: 'relative',
                        zIndex: 2,
                        mt: { xs: 8, md: 12 },
                        textAlign: 'center'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Typography
                            variant="h1"
                            sx={{
                                fontSize: { xs: '2.5rem', md: '3.5rem' },
                                fontWeight: 700,
                                mb: 3,
                                position: 'relative',
                                background: 'linear-gradient(45deg, #6C63FF, #FF6584)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))',
                                letterSpacing: '0.5px',
                                zIndex: 5
                            }}
                        >
                            Smart Expense Tracking
                        </Typography>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants}>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    textAlign: 'center',
                                    mb: 4,
                                    maxWidth: '800px',
                                    mx: 'auto',
                                    background: 'linear-gradient(45deg, #fff, rgba(108, 99, 255, 0.7))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))',
                                    fontWeight: 500
                                }}
                            >
                                Take control of your finances with powerful analytics 
                                and intelligent insights
                            </Typography>
                        </motion.div>

                        <motion.div 
                            variants={itemVariants}
                            style={{ textAlign: 'center', marginBottom: '64px' }}
                        >
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate('/register')}
                                sx={{ mr: 2 }}
                            >
                                Get Started Free
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </Button>
                        </motion.div>

                        {/* Features Grid */}
                        <Grid 
                            container 
                            spacing={3} 
                            sx={{ 
                                mt: 4,
                                alignItems: 'stretch', // Add this to stretch cards
                                justifyContent: 'center' // Add this to center cards
                            }}
                        >
                            {features.map((feature, index) => (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <motion.div
                                        variants={cardVariants}
                                        whileHover={{ scale: 1.02 }} // Reduced scale for better visual
                                        style={{ height: '100%' }} // Add this for full height
                                    >
                                        <FeatureCard>
                                            <CardContent sx={{ 
                                                p: 4,
                                                height: '100%', // Add this for full height
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-start' // Add this for consistent alignment
                                            }}>
                                                <Box sx={{ 
                                                    color: 'primary.main', 
                                                    mb: 2,
                                                    fontSize: '2.5rem'
                                                }}>
                                                    {feature.icon}
                                                </Box>
                                                <Typography 
                                                    variant="h6" 
                                                    sx={{ 
                                                        mb: 2,
                                                        fontWeight: 600 
                                                    }}
                                                >
                                                    {feature.title}
                                                </Typography>
                                                <Typography 
                                                    variant="body2"
                                                    sx={{ 
                                                        color: 'grey.400',
                                                        flex: 1 // Add this to push content to top
                                                    }}
                                                >
                                                    {feature.description}
                                                </Typography>
                                            </CardContent>
                                        </FeatureCard>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Container>

                <Footer />
            </Box>
        </ThemeProvider>
    );
};

export default HomePage;