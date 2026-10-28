package com.clrms.config;

import com.clrms.entity.NgoOrganization;
import com.clrms.entity.User;
import com.clrms.entity.UserRole;
import com.clrms.repository.NgoOrganizationRepository;
import com.clrms.repository.OfficerProfileRepository;
import com.clrms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DemoAccountConfigurationTest {
    @Test
    void fillsOnlyUnconfiguredDemoNgoCapacity() throws Exception {
        UserRepository users = mock(UserRepository.class);
        OfficerProfileRepository profiles = mock(OfficerProfileRepository.class);
        NgoOrganizationRepository ngos = mock(NgoOrganizationRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

        User demoOfficial = new User();
        demoOfficial.setRole(UserRole.NGO_OFFICIAL);
        demoOfficial.setNgoOrganizationId(7L);
        demoOfficial.setDemoAccount(true);
        User realOfficial = new User();
        realOfficial.setRole(UserRole.NGO_OFFICIAL);
        realOfficial.setNgoOrganizationId(8L);
        realOfficial.setDemoAccount(false);

        NgoOrganization unconfiguredDemo = new NgoOrganization();
        unconfiguredDemo.setCapacity(0);
        unconfiguredDemo.setAvailableBeds(0);
        NgoOrganization configured = new NgoOrganization();
        configured.setCapacity(12);
        configured.setAvailableBeds(4);

        when(users.count()).thenReturn(2L);
        when(users.findAll()).thenReturn(List.of(demoOfficial, realOfficial));
        when(ngos.findById(7L)).thenReturn(Optional.of(unconfiguredDemo));
        when(ngos.findById(8L)).thenReturn(Optional.of(configured));

        CommandLineRunner runner = new DemoAccountConfiguration().seedDemoAccounts(
                users, profiles, ngos, passwordEncoder, true, "unused");
        runner.run(new String[0]);

        assertEquals(5, unconfiguredDemo.getCapacity());
        assertEquals(5, unconfiguredDemo.getAvailableBeds());
        assertEquals(12, configured.getCapacity());
        assertEquals(4, configured.getAvailableBeds());
        verify(ngos).save(unconfiguredDemo);
        verify(ngos, never()).save(configured);
    }
}
