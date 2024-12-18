import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  Avatar,
  HStack,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
} from '@chakra-ui/icons';
import { useSession, signOut } from 'next-auth/react';
import { useTenants } from '../../hooks/useTenants';

interface NavbarProps {
  onOpen: () => void;
}

export default function Navbar({ onOpen }: NavbarProps) {
  const { data: session } = useSession();
  const { currentTenant, tenants, setCurrentTenant } = useTenants();

  return (
    <Box
      px={4}
      height="20"
      borderBottom={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.900')}
      bg={useColorModeValue('white', 'gray.800')}
    >
      <Flex
        h={16}
        alignItems={'center'}
        justifyContent={'space-between'}
      >
        <IconButton
          display={{ base: 'flex', md: 'none' }}
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<HamburgerIcon />}
        />

        <HStack spacing={8} alignItems={'center'}>
          <Box>EriEthio CMS</Box>
          {currentTenant && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="ghost"
              >
                {currentTenant.name}
              </MenuButton>
              <MenuList>
                {tenants?.map((tenant) => (
                  <MenuItem
                    key={tenant.id}
                    onClick={() => setCurrentTenant(tenant)}
                  >
                    {tenant.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          )}
        </HStack>

        <Flex alignItems={'center'}>
          <Stack direction={'row'} spacing={7}>
            <Menu>
              <MenuButton
                as={Button}
                rounded={'full'}
                variant={'link'}
                cursor={'pointer'}
                minW={0}>
                <Avatar
                  size={'sm'}
                  name={session?.user?.name || undefined}
                />
              </MenuButton>
              <MenuList alignItems={'center'}>
                <Box px={4} py={2}>
                  <Text>{session?.user?.name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    {session?.user?.email}
                  </Text>
                </Box>
                <MenuDivider />
                <MenuItem onClick={() => signOut()}>Sign Out</MenuItem>
              </MenuList>
            </Menu>
          </Stack>
        </Flex>
      </Flex>
    </Box>
  );
}
