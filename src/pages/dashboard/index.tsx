import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Text,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FiFile, FiUsers, FiImage, FiShoppingBag } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { useTenants } from '../../hooks/useTenants';
import DashboardLayout from '../../components/layout/DashboardLayout';

interface StatsCardProps {
  title: string;
  stat: string;
  icon: React.ElementType;
  helpText?: string;
}

function StatsCard(props: StatsCardProps) {
  const { title, stat, icon, helpText } = props;
  return (
    <Stat
      px={{ base: 2, md: 4 }}
      py={'5'}
      shadow={'xl'}
      border={'1px solid'}
      borderColor={useColorModeValue('gray.800', 'gray.500')}
      rounded={'lg'}>
      <Flex justifyContent={'space-between'}>
        <Box pl={{ base: 2, md: 4 }}>
          <StatLabel fontWeight={'medium'} isTruncated>
            {title}
          </StatLabel>
          <StatNumber fontSize={'2xl'} fontWeight={'medium'}>
            {stat}
          </StatNumber>
          {helpText && (
            <StatHelpText>
              {helpText}
            </StatHelpText>
          )}
        </Box>
        <Box
          my={'auto'}
          color={useColorModeValue('gray.800', 'gray.200')}
          alignContent={'center'}>
          <Icon as={icon} w={8} h={8} />
        </Box>
      </Flex>
    </Stat>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const { currentTenant, isLoading } = useTenants();

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <DashboardLayout>
      <Box maxW="7xl" mx={'auto'} pt={5} px={{ base: 2, sm: 12, md: 17 }}>
        <Text fontSize="2xl" fontWeight="bold" mb={8}>
          Welcome back, {session?.user?.name}
        </Text>
        
        {currentTenant && (
          <>
            <Text fontSize="lg" mb={4}>
              {currentTenant.name} Dashboard
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={{ base: 5, lg: 8 }}>
              <StatsCard
                title={'Pages'}
                stat={'15'}
                icon={FiFile}
                helpText={'5 published'}
              />
              <StatsCard
                title={'Team Members'}
                stat={'8'}
                icon={FiUsers}
              />
              <StatsCard
                title={'Assets'}
                stat={'45'}
                icon={FiImage}
                helpText={'2.3 GB used'}
              />
              <StatsCard
                title={'Products'}
                stat={'23'}
                icon={FiShoppingBag}
                helpText={'12 active'}
              />
            </SimpleGrid>
          </>
        )}
      </Box>
    </DashboardLayout>
  );
}
