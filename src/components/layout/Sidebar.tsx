import React from 'react';
import {
  Box,
  CloseButton,
  Flex,
  useColorModeValue,
  Text,
  BoxProps,
  Icon,
  Link,
} from '@chakra-ui/react';
import {
  FiHome,
  FiFile,
  FiImage,
  FiUsers,
  FiSettings,
  FiShoppingBag,
} from 'react-icons/fi';
import { IconType } from 'react-icons';
import NextLink from 'next/link';
import { useRouter } from 'next/router';

interface LinkItemProps {
  name: string;
  icon: IconType;
  href: string;
}

const LinkItems: Array<LinkItemProps> = [
  { name: 'Dashboard', icon: FiHome, href: '/dashboard' },
  { name: 'Pages', icon: FiFile, href: '/dashboard/pages' },
  { name: 'Assets', icon: FiImage, href: '/dashboard/assets' },
  { name: 'Products', icon: FiShoppingBag, href: '/dashboard/products' },
  { name: 'Team', icon: FiUsers, href: '/dashboard/team' },
  { name: 'Settings', icon: FiSettings, href: '/dashboard/settings' },
];

interface SidebarProps extends BoxProps {
  onClose: () => void;
}

export default function Sidebar({ onClose, ...rest }: SidebarProps) {
  const router = useRouter();

  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}>
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontFamily="monospace" fontWeight="bold">
          EriEthio
        </Text>
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      {LinkItems.map((link) => (
        <NavItem
          key={link.name}
          icon={link.icon}
          href={link.href}
          isActive={router.pathname === link.href}
        >
          {link.name}
        </NavItem>
      ))}
    </Box>
  );
}

interface NavItemProps extends BoxProps {
  icon: IconType;
  href: string;
  isActive?: boolean;
  children: React.ReactNode;
}

const NavItem = ({ icon, href, isActive, children, ...rest }: NavItemProps) => {
  return (
    <Link
      as={NextLink}
      href={href}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? 'brand.primary' : 'transparent'}
        color={isActive ? 'white' : 'inherit'}
        _hover={{
          bg: 'brand.primary',
          color: 'white',
        }}
        {...rest}>
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            _groupHover={{
              color: 'white',
            }}
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};
